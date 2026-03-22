import type { DerivedMetrics } from '@whatcanirun/shared';
import chalk from 'chalk';
import { defineCommand } from 'citty';

import { createBundle } from '../bundle/create';
import { validateBundle } from '../bundle/validate';
import { detectDevice } from '../device/detect';
import {
  findHfCachePath,
  getHfCacheBlobSize,
  getHfRepoSize,
  inspectModel,
  isHuggingFaceRepoId,
  resolveModel,
} from '../model/resolve';
import { resolveRuntime } from '../runtime/resolve';
import type { BenchResult } from '../runtime/types';
import { uploadBundle } from '../upload/client';
import { binName } from '../utils/bin';
import { DEFAULT_BUNDLES_DIR } from '../utils/id';
import * as log from '../utils/log';
import { Spinner } from '../utils/log';

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
      description: 'Hugging Face repo ID or local model path',
      required: true,
    },
    runtime: {
      type: 'string',
      description: 'Runtime to use (mlx_lm, llama.cpp)',
      required: true,
    },
    'prompt-tokens': {
      type: 'string',
      description: 'Prompt token count (default: 4,096)',
    },
    'gen-tokens': {
      type: 'string',
      description: 'Generation token count (default: 1,024)',
    },
    trials: {
      type: 'string',
      description: 'Number of trials (default: 10)',
    },
    notes: {
      type: 'string',
      description: 'Optional notes attached to the run',
    },
    submit: {
      type: 'boolean',
      description: 'Upload results after benchmark',
      default: false,
    },
    output: {
      type: 'string',
      description: 'Bundle output directory (default: ~/.whatcanirun/bundles)',
    },
  },
  async run({ args }) {
    const promptTokens = parsePositiveInt(
      (args['prompt-tokens'] as string) || '4096',
      'prompt-tokens'
    );
    const genTokens = parsePositiveInt((args['gen-tokens'] as string) || '1024', 'gen-tokens');
    const numTrials = parsePositiveInt((args.trials as string) || '10', 'trials');
    const outputDir = (args.output as string) || DEFAULT_BUNDLES_DIR;

    // Detect device.
    const deviceSpinner = new log.Spinner(chalk.dim('Detecting device…')).start();
    let device;
    try {
      device = await detectDevice();
      deviceSpinner.stop(
        chalk.white(
          `[${chalk.green('✓')}] ${chalk.cyan(device.os_name)} (${chalk.cyan(device.os_version)}) detected.`
        )
      );
    } catch (e: unknown) {
      deviceSpinner.stop(chalk.white(`[${chalk.red('✖')}] Device detection failed.`));
      log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
        prefix: chalk.dim.red(' ↳ '),
      });
      process.exit(1);
    }

    // Resolve and detect runtime.
    const runtimeSpinner = new log.Spinner(chalk.dim('Detecting runtime…')).start();
    let adapter;
    let runtimeInfo;
    try {
      adapter = resolveRuntime(args.runtime as string);
      runtimeInfo = await adapter.detect();
      if (!runtimeInfo) {
        runtimeSpinner.stop(
          chalk.white(
            `[${chalk.red('✖')}] Runtime "${chalk.cyan(args.runtime)}" is not available. Make sure it is installed and on ${chalk.cyan('PATH')}.`
          )
        );
        const installHints: Record<string, string> = {
          mlx_lm: `Install with ${chalk.bold.cyan('brew install mlx-lm')} or ${chalk.bold.cyan('pip install mlx-lm')}.`,
          'llama.cpp': `Install with ${chalk.bold.cyan('brew install llama.cpp')}.`,
        };
        const hint = installHints[args.runtime as string];
        if (hint) console.log(chalk.dim(` ↳ ${hint}`));
        process.exit(1);
      }
      runtimeSpinner.stop(
        chalk.white(
          `[${chalk.green('✓')}] ${chalk.cyan(runtimeInfo.name)} (${chalk.cyan(runtimeInfo.version)}) detected.`
        )
      );
    } catch (e: unknown) {
      runtimeSpinner.stop(chalk.white(`[${chalk.red('✖')}] Runtime resolution failed.`));
      log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
        prefix: chalk.dim.red(' ↳ '),
      });
      process.exit(1);
    }

    // Resolve and inspect model.
    const modelInspectSpinner = new log.Spinner(chalk.dim('Inspecting model…')).start();
    let modelRef: string;
    let modelInfo;
    try {
      modelRef = await resolveModel(args.model as string);
      modelInfo = await inspectModel(modelRef);
      if (!modelInfo.artifact_sha256 && !isHuggingFaceRepoId(modelRef)) {
        modelInspectSpinner.stop(
          chalk.white(`[${chalk.red('✖')}] Model "${chalk.cyan(modelRef)}" not found.`)
        );
        process.exit(1);
      }
      modelInspectSpinner.stop(chalk.white(`[${chalk.green('✓')}] Model inspected:`));
    } catch (e: unknown) {
      modelInspectSpinner.stop(chalk.white(`[${chalk.red('✖')}] Model not found.`));
      log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
        prefix: chalk.dim.red(' ↳ '),
      });
      process.exit(1);
    }

    // Display config.
    const rows: [string, string][] = [
      ['Model', modelInfo.display_name],
      ...(modelInfo.parameters ? [['Parameters', modelInfo.parameters] as [string, string]] : []),
      ['Format', modelInfo.format],
      ...(modelInfo.quant ? [['Quant', modelInfo.quant] as [string, string]] : []),
    ];
    const maxKey = Math.max(...rows.map(([k]) => k.length));
    for (const [key, value] of rows) {
      console.log(chalk.dim(` →  ${key.padEnd(maxKey)}  ${chalk.reset.white(value)}`));
    }

    // Resolve model (download or load from cache).
    const isLocal = !isHuggingFaceRepoId(modelRef);
    const isCached = isLocal || findHfCachePath(modelRef) !== null;
    const resolveMsg = isCached
      ? chalk.dim('Loading model from cache…')
      : chalk.dim('Downloading model…');
    const resolveSpinner = new Spinner(resolveMsg).start();

    // File system-based download progress tracking.
    let downloadPoll: ReturnType<typeof setInterval> | null = null;
    let downloadDone = false;

    if (!isCached && isHuggingFaceRepoId(modelRef)) {
      const initialBlobSize = getHfCacheBlobSize(modelRef);
      getHfRepoSize(modelRef).then((expectedSize) => {
        if (!expectedSize || downloadDone) return;
        resolveSpinner.setTotal(100);
        resolveSpinner.update(chalk.dim('Downloading model'));
        downloadPoll = setInterval(() => {
          const currentSize = getHfCacheBlobSize(modelRef);
          const downloaded = currentSize - initialBlobSize;
          const pct = Math.min(Math.round((downloaded / expectedSize) * 100), 99);
          resolveSpinner.setCurrent(pct);
          resolveSpinner.setDetail(`${formatBytes(downloaded)} / ${formatBytes(expectedSize)}`);
        }, 200);
      });
    }

    const stopDownloadPoll = () => {
      if (downloadPoll) {
        clearInterval(downloadPoll);
        downloadPoll = null;
      }
      downloadDone = true;
    };

    // Run benchmark.
    let bench: BenchResult;
    let trialsStarted = false;
    let lastTrial = 0;
    const benchSpinner = new Spinner(chalk.dim('Warming up…'));

    try {
      bench = await adapter.benchmark({
        model: modelRef,
        promptTokens,
        genTokens,
        numTrials,
        onProgress: (msg) => {
          // Transition from resolve spinner to bench spinner on first
          // non-download message.
          if (!benchSpinner.isRunning() && !/Downloading model/i.test(msg)) {
            stopDownloadPoll();
            const resolveLabel = isCached
              ? `${chalk.cyan(modelInfo.display_name)} loaded from disk.`
              : `${chalk.cyan(modelInfo.display_name)} downloaded.`;
            resolveSpinner.stop(chalk.white(`[${chalk.green('✓')}] ${resolveLabel}`));
            benchSpinner.start();
          }

          const trialMatch = msg.match(/^Trial (\d+)\/(\d+)/);
          if (trialMatch) {
            const trial = parseInt(trialMatch[1]!, 10);
            const total = parseInt(trialMatch[2]!, 10);
            if (!trialsStarted) {
              trialsStarted = true;
              benchSpinner.setTotal(total);
              benchSpinner.setDetail('');
              benchSpinner.update(chalk.dim('Running trials'));
            }
            if (trial > lastTrial) {
              lastTrial = trial;
              const tpsMatch = msg.match(/— ([\d.]+ tok\/s)/);
              if (tpsMatch) benchSpinner.setDetail(tpsMatch[1]!);
              benchSpinner.tick();
            }
          } else if (/Downloading model/i.test(msg)) {
            return;
          }
        },
      });

      // If warmup was never reported (edge case), close resolve spinner now.
      if (!benchSpinner.isRunning()) {
        stopDownloadPoll();
        const resolveLabel = isCached
          ? `${chalk.cyan(modelInfo.display_name)} loaded from disk.`
          : `${chalk.cyan(modelInfo.display_name)} downloaded.`;
        resolveSpinner.stop(chalk.white(`[${chalk.green('✓')}] ${resolveLabel}`));
      }

      benchSpinner.stop(
        chalk.white(
          `[${chalk.green('✓')}] ${bench.trials.length}/${numTrials} trial${numTrials > 1 ? 's' : ''} ran successfully:`
        )
      );
    } catch (e: unknown) {
      stopDownloadPoll();
      // Close whichever spinner is active.
      if (benchSpinner.isRunning()) {
        benchSpinner.stop(chalk.white(`[${chalk.red('✖')}] Benchmark failed.`));
      } else {
        resolveSpinner.stop(chalk.white(`[${chalk.red('✖')}] Model resolution failed.`));
      }
      log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
        prefix: chalk.dim.red(' ↳ '),
      });
      process.exit(1);
    }

    // Re-inspect model after benchmark so HF cache is populated on first run.
    if (!modelInfo.artifact_sha256) {
      const updated = await inspectModel(modelRef);
      Object.assign(modelInfo, updated);
    }

    // Compute derived metrics.
    const metrics = computeMetrics(bench);

    // Display results.
    const resultRows: [string, string][] = [
      ['TTFT p50/p95', `${metrics.ttftP50Ms} ms / ${metrics.ttftP95Ms} ms`],
      ['Prefill TPS', `${metrics.prefillTpsMean} tok/s`],
      ['Decode TPS', `${metrics.decodeTpsMean} tok/s`],
      ...(metrics.idleRssMb > 0
        ? [['Idle Memory', `${(metrics.idleRssMb / 1_024).toFixed(2)} GB`] as [string, string]]
        : []),
      ...(metrics.peakRssMb > 0
        ? [['Peak Memory', `${(metrics.peakRssMb / 1_024).toFixed(2)} GB`] as [string, string]]
        : []),
    ];
    const maxResultKey = Math.max(...resultRows.map(([k]) => k.length));
    for (const [key, value] of resultRows) {
      console.log(chalk.dim(` →  ${key.padEnd(maxResultKey)}  ${chalk.reset.cyan(value)}`));
    }

    // Create bundle.
    const bundlePath = await createBundle({
      outputDir,
      device,
      runtimeInfo,
      model: modelInfo,
      bench,
      metrics,
      notes: args.notes as string | undefined,
    });

    // Validate bundle.
    const validationSpinner = new log.Spinner(chalk.dim('Validating bundle…')).start();
    const validation = await validateBundle(bundlePath);
    if (!validation.valid) {
      validationSpinner.stop(
        chalk.white(`[${chalk.red('✖')}] ${chalk.bold.red('Bundle validation failed.')}`)
      );
      for (const err of validation.errors) {
        log.error(chalk.dim(err), { prefix: chalk.dim.red(' ↳ ') });
      }
      process.exit(1);
    }
    validationSpinner.stop(chalk.white(`[${chalk.green('✓')}] Bundle is valid.`));
    console.log(chalk.dim(` ↳ Saved to ${log.filepath(bundlePath)}.`));

    // Upload bundle.
    if (args.submit) {
      const uploadSpinner = new log.Spinner(chalk.dim('Uploading bundle…')).start();
      try {
        const result = await uploadBundle(bundlePath);
        uploadSpinner.stop(
          chalk.white(`[${chalk.green('✓')}] Uploaded run: ${chalk.underline(result.run_url)}`)
        );
      } catch (e: unknown) {
        uploadSpinner.stop(chalk.white(`[${chalk.red('✖')}] Run upload failed.`));
        log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
          prefix: chalk.dim.red(' ↳ '),
        });
        console.log();
        console.log(
          chalk.dim(
            `You can submit with ${chalk.bold.cyan(`${binName()} submit ${log.filepath(bundlePath)}`)}.`
          )
        );
      }
    }
  },
});

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

  // Sort prompt TPS ascending (low TPS = high latency).
  const sortedPromptTps = trials.map((t) => t.promptTps).sort((a, b) => a - b);
  // TTFT estimated from prefill TPS: `prompt_tokens / prompt_tps * 1000`.
  const p50PromptTps = nearestRankPercentile(sortedPromptTps, 50);
  const ttftP50Ms =
    p50PromptTps > 0 ? Math.round((promptTokens / p50PromptTps) * 1000 * 100) / 100 : 0;
  const p5PromptTps = nearestRankPercentile(sortedPromptTps, 5);
  const ttftP95Ms =
    p5PromptTps > 0 ? Math.round((promptTokens / p5PromptTps) * 1000 * 100) / 100 : 0;

  const decodeTpsMean = Math.round(averages.generationTps * 10) / 10;
  const prefillTpsMean = Math.round(averages.promptTps * 10) / 10;

  // Weighted TPS: `(prompt_tokens * prompt_tps + gen_tokens * gen_tps) / (prompt_tokens + gen_tokens)`.
  const weightedTpsMean =
    promptTokens + completionTokens > 0
      ? Math.round(
          ((promptTokens * averages.promptTps + completionTokens * averages.generationTps) /
            (promptTokens + completionTokens)) *
            10
        ) / 10
      : 0;

  const peakRssMb = Math.round(averages.peakMemoryGb * 1024 * 10) / 10;
  const idleRssMb = Math.round(averages.idleMemoryGb * 1024 * 10) / 10;

  return {
    ttftP50Ms,
    ttftP95Ms,
    decodeTpsMean,
    prefillTpsMean,
    weightedTpsMean,
    idleRssMb,
    peakRssMb,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function parsePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (isNaN(n) || n <= 0) {
    log.error(
      `Invalid value for ${chalk.bold.cyan(`--${name}`)}: "${chalk.cyan(value)}". Expected a positive integer.`
    );
    process.exit(1);
  }
  return n;
}

export default command;
