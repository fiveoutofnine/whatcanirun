import { defineCommand } from 'citty';
import { homedir } from 'os';
import { join } from 'path';

import { createBundle, type DerivedMetrics } from '../bundle/create';
import { validateBundle } from '../bundle/validate';
import { detectDevice } from '../device/detect';
import { inspectModel, resolveModel } from '../model/resolve';
import { resolveRuntime } from '../runtime/resolve';
import type { BenchResult } from '../runtime/types';
import { uploadBundle } from '../upload/client';
import * as log from '../utils/log';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Nearest-rank percentile on a sorted-ascending array. */
function nearestRankPercentile(sorted: number[], p: number): number {
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, rank)]!;
}

function computeMetrics(bench: BenchResult): DerivedMetrics {
  const { promptTokens, completionTokens, trials, averages } = bench;

  // Sort prompt TPS ascending (low TPS = high latency)
  const sortedPromptTps = trials.map((t) => t.promptTps).sort((a, b) => a - b);

  // TTFT estimated from prefill throughput: prompt_tokens / prompt_tps * 1000
  const p50PromptTps = nearestRankPercentile(sortedPromptTps, 50);
  const ttftP50Ms =
    p50PromptTps > 0 ? Math.round((promptTokens / p50PromptTps) * 1000 * 100) / 100 : 0;

  // p5 of prompt TPS = p95 of TTFT latency
  const p5PromptTps = nearestRankPercentile(sortedPromptTps, 5);
  const ttftP95Ms =
    p5PromptTps > 0 ? Math.round((promptTokens / p5PromptTps) * 1000 * 100) / 100 : 0;

  const decodeTpsMean = Math.round(averages.generationTps * 10) / 10;

  // Weighted TPS: (prompt_tokens * prompt_tps + gen_tokens * gen_tps) / (prompt_tokens + gen_tokens)
  const weightedTpsMean =
    promptTokens + completionTokens > 0
      ? Math.round(
          ((promptTokens * averages.promptTps + completionTokens * averages.generationTps) /
            (promptTokens + completionTokens)) *
            10
        ) / 10
      : 0;

  const peakRssMb = Math.round(averages.peakMemoryGb * 1024 * 10) / 10;

  return { ttftP50Ms, ttftP95Ms, decodeTpsMean, weightedTpsMean, peakRssMb };
}

// -----------------------------------------------------------------------------
// Command
// -----------------------------------------------------------------------------

const command = defineCommand({
  meta: {
    name: 'run',
    description: 'Run a benchmark and optionally submit results',
  },
  args: {
    model: {
      type: 'string',
      description: 'HuggingFace repo ID or local model path',
      required: true,
    },
    runtime: {
      type: 'string',
      description: 'Runtime to use (mlx_lm, llama.cpp)',
      required: true,
    },
    'prompt-tokens': {
      type: 'string',
      description: 'Prompt token count (default: 512)',
      default: '512',
    },
    'gen-tokens': {
      type: 'string',
      description: 'Generation token count (default: 1024)',
      default: '1024',
    },
    trials: {
      type: 'string',
      description: 'Number of trials (default: 5)',
      default: '5',
    },
    notes: {
      type: 'string',
      description: 'Optional notes attached to the run',
    },
    submit: {
      type: 'boolean',
      description: 'Upload results after benchmark (use --no-submit to skip)',
      default: true,
    },
    output: {
      type: 'string',
      description: 'Bundle output directory',
      default: join(homedir(), '.wcir', 'bundles'),
    },
  },
  async run({ args }) {
    const promptTokens = parseInt(args['prompt-tokens'] as string, 10);
    const genTokens = parseInt(args['gen-tokens'] as string, 10);
    const numTrials = parseInt(args.trials as string, 10);

    // Resolve runtime
    let adapter;
    try {
      adapter = resolveRuntime(args.runtime as string);
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }

    // Detect runtime
    const runtimeInfo = await adapter.detect();
    if (!runtimeInfo) {
      log.error(
        `Runtime '${args.runtime}' is not available. Make sure it is installed and on PATH.`
      );
      const installHints: Record<string, string> = {
        mlx_lm: 'Install with: pip install mlx-lm',
        'llama.cpp': 'Install with: brew install llama.cpp',
      };
      const hint = installHints[args.runtime as string];
      if (hint) {
        log.blank();
        log.info(hint);
      }
      process.exit(1);
    }

    // Resolve and inspect model
    let modelRef: string;
    try {
      modelRef = await resolveModel(args.model as string);
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }

    log.info('Inspecting model...');
    const modelInfo = await inspectModel(modelRef);

    // Detect device
    const device = await detectDevice();

    // Display config
    log.blank();
    log.label('Model', modelInfo.display_name);
    if (modelInfo.parameters) log.label('Parameters', modelInfo.parameters);
    log.label('Format', modelInfo.format);
    if (modelInfo.quant) log.label('Quant', modelInfo.quant);
    log.label('Device', `${device.cpu_model} (${device.ram_gb}GB)`);
    log.label('Runtime', `${runtimeInfo.name} ${runtimeInfo.version}`);
    log.label('Config', `pp=${promptTokens} tg=${genTokens} trials=${numTrials}`);
    log.blank();

    // Run benchmark
    log.info('Running benchmark...');
    let bench: BenchResult;
    try {
      bench = await adapter.benchmark({
        model: modelRef,
        promptTokens,
        genTokens,
        numTrials,
      });
    } catch (e: unknown) {
      log.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }

    // Compute derived metrics
    const metrics = computeMetrics(bench);

    // Display results
    log.blank();
    log.header('Results');
    log.label('TTFT (est) p50/p95', `${metrics.ttftP50Ms} ms / ${metrics.ttftP95Ms} ms`);
    log.label('Decode TPS', `${metrics.decodeTpsMean} tok/s`);
    log.label('Prefill TPS', `${Math.round(bench.averages.promptTps * 10) / 10} tok/s`);
    log.label('Weighted TPS', `${metrics.weightedTpsMean} tok/s`);
    if (metrics.peakRssMb > 0) {
      log.label('Peak Memory', `${(metrics.peakRssMb / 1024).toFixed(2)} GB`);
    }
    log.label('Trials', `${bench.trials.length}/${bench.trials.length} passed`);
    log.blank();

    // Create bundle
    const bundlePath = await createBundle({
      outputDir: args.output as string,
      device,
      runtimeInfo,
      model: modelInfo,
      bench,
      metrics,
      notes: args.notes as string | undefined,
    });

    // Validate
    const validation = await validateBundle(bundlePath);
    if (!validation.valid) {
      log.warn('Bundle validation issues:');
      for (const err of validation.errors) {
        log.warn(`  ${err}`);
      }
    }

    log.info(`Bundle saved to ${bundlePath}`);

    // Upload
    if (args.submit) {
      log.blank();
      log.info('Uploading...');
      try {
        const result = await uploadBundle(bundlePath);
        log.blank();
        log.header('Run created:');
        console.log(result.run_url);
        log.blank();
        log.label('Status', result.status);
      } catch (e: unknown) {
        log.error(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
        log.info('Bundle is saved locally. You can submit later with:');
        log.info(`  whatcanirun submit ${bundlePath}`);
      }
    }
  },
});

export default command;
