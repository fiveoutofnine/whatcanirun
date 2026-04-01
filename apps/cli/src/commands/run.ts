import type { DerivedMetrics } from '@whatcanirun/shared';
import chalk from 'chalk';
import { defineCommand } from 'citty';
import { dirname } from 'node:path';

import { createBundle } from '../bundle/create';
import { validateBundle } from '../bundle/validate';
import { detectDevice } from '../device/detect';
import {
  type DownloadProgress,
  findHfCachePath,
  getHfCacheBlobSize,
  getHfRepoSize,
  inferModelFromName,
  inspectModel,
  isHuggingFaceFileRef,
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
// Types
// -----------------------------------------------------------------------------

export interface BenchmarkOpts {
  model: string;
  runtime: string;
  promptTokens?: number;
  genTokens?: number;
  trials?: number;
  notes?: string;
  submit?: boolean;
  output?: string;
}

// -----------------------------------------------------------------------------
// Core benchmark logic
// -----------------------------------------------------------------------------

export async function executeBenchmark(opts: BenchmarkOpts): Promise<string> {
  const promptTokens = opts.promptTokens ?? 4096;
  const genTokens = opts.genTokens ?? 1024;
  const numTrials = opts.trials ?? 10;
  const outputDir = opts.output ?? DEFAULT_BUNDLES_DIR;

  // Graceful Ctrl+C handling.
  const controller = new AbortController();
  let activeSpinner: log.Spinner | null = null;
  let downloadPollCleanup: (() => void) | null = null;

  let interrupted = false;
  const onSigint = () => {
    interrupted = true;
    controller.abort();
    downloadPollCleanup?.();
    if (activeSpinner?.isRunning()) {
      activeSpinner.stop(chalk.white(`[${chalk.gray('−')}] ${chalk.yellow('Interrupted ⚠')}`));
    }
    console.log();
  };
  process.on('SIGINT', onSigint);

  try {
    // Detect device.
    const deviceSpinner = new log.Spinner(chalk.dim('Detecting device…')).start();
    activeSpinner = deviceSpinner;
    let device;
    try {
      device = await detectDevice();
      activeSpinner = null;
      deviceSpinner.stop(
        chalk.white(
          `[${chalk.green('✓')}] ${chalk.cyan(device.os_name)} (${chalk.cyan(device.os_version)}) detected.`
        )
      );
    } catch (e: unknown) {
      if (!interrupted) {
        deviceSpinner.stop(chalk.white(`[${chalk.red('✖')}] Device detection failed.`));
        log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
          prefix: chalk.dim.red(' ↳ '),
        });
      }
      throw new Error('Device detection failed.');
    }

    // Resolve and detect runtime.
    const runtimeSpinner = new log.Spinner(chalk.dim('Detecting runtime…')).start();
    activeSpinner = runtimeSpinner;
    let adapter;
    let runtimeInfo;
    try {
      adapter = resolveRuntime(opts.runtime);
      runtimeInfo = await adapter.detect();
      if (!runtimeInfo) {
        runtimeSpinner.stop(
          chalk.white(
            `[${chalk.red('✖')}] Runtime "${chalk.cyan(opts.runtime)}" is not available. Make sure it is installed and on ${chalk.cyan('PATH')}.`
          )
        );
        const installHints: Record<string, string> = {
          mlx_lm: `Install with ${chalk.bold.cyan('brew install mlx-lm')} or ${chalk.bold.cyan('pip install mlx-lm')}.`,
          'llama.cpp': `Install with ${chalk.bold.cyan('brew install llama.cpp')}.`,
        };
        const hint = installHints[opts.runtime];
        if (hint) console.log(chalk.dim(` ↳ ${hint}`));
        throw new Error(`Runtime "${opts.runtime}" is not available.`);
      }
      activeSpinner = null;
      runtimeSpinner.stop(
        chalk.white(
          `[${chalk.green('✓')}] ${chalk.cyan(runtimeInfo.name)} (${chalk.cyan(runtimeInfo.version)}) found.`
        )
      );
    } catch (e: unknown) {
      if (!interrupted && runtimeSpinner.isRunning()) {
        runtimeSpinner.stop(chalk.white(`[${chalk.red('✖')}] Runtime resolution failed.`));
        log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
          prefix: chalk.dim.red(' ↳ '),
        });
      }
      throw e instanceof Error ? e : new Error(String(e));
    }

    // Resolve model.
    // - Local paths and bare HF repo IDs resolve instantly.
    // - "repo:file.gguf" refs download the file first (with progress).
    const modelSpinner = new log.Spinner(chalk.dim('Resolving model…')).start();
    activeSpinner = modelSpinner;
    let modelRef: string;
    let modelDownloaded = false;
    let modelInfoGuessed;
    try {
      modelRef = await resolveModel(opts.model, {
        runtime: opts.runtime,
        signal: controller.signal,
        onDownloadProgress: ({ downloadedBytes, totalBytes }: DownloadProgress) => {
          modelDownloaded = true;
          if (totalBytes) {
            modelSpinner.setTotal(100, { percent: true });
            modelSpinner.update(chalk.dim('Downloading model'));
            const pct = Math.min(Math.round((downloadedBytes / totalBytes) * 100), 99);
            modelSpinner.setCurrent(pct);
            modelSpinner.setDetail(`${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}`);
          }
        },
      });
      modelInfoGuessed = inferModelFromName(modelRef);
      activeSpinner = null;
      modelSpinner.stop(chalk.white(`[${chalk.green('✓')}] Model resolved:`));
    } catch (e: unknown) {
      if (!interrupted) {
        modelSpinner.stop(chalk.white(`[${chalk.red('✖')}] Model resolution failed.`));
        log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
          prefix: chalk.dim.red(' ↳ '),
        });
      }
      throw e instanceof Error ? e : new Error(String(e));
    }

    // Display config.
    const rows: [string, string][] = [
      ['Model', modelInfoGuessed.display_name],
      ...(modelInfoGuessed.parameters
        ? [['Parameters', modelInfoGuessed.parameters] as [string, string]]
        : []),
      ['Format', modelInfoGuessed.format],
      ...(modelInfoGuessed.quant ? [['Quant', modelInfoGuessed.quant] as [string, string]] : []),
    ];
    const maxKey = Math.max(...rows.map(([k]) => k.length));
    for (const [key, value] of rows) {
      console.log(
        chalk.dim(` →  ${key.padEnd(maxKey)}  ${chalk.reset.cyan(value)} ${chalk.dim('(guessed)')}`)
      );
    }
    if (modelDownloaded) {
      console.log(chalk.dim(` ↳  Cached at ${log.filepath(modelRef)}.`));
    }

    // Resolve model (download or load from cache).
    const isLocal = !isHuggingFaceRepoId(modelRef);
    const isCached = isLocal || findHfCachePath(modelRef) !== null;
    const resolveMsg = isCached
      ? chalk.dim('Loading model from cache…')
      : chalk.dim('Downloading model…');
    const resolveSpinner = new Spinner(resolveMsg).start();
    activeSpinner = resolveSpinner;

    // File system-based download progress tracking.
    let downloadPoll: ReturnType<typeof setInterval> | null = null;
    let downloadDone = false;

    if (!isCached && isHuggingFaceRepoId(modelRef)) {
      const initialBlobSize = getHfCacheBlobSize(modelRef);
      getHfRepoSize(modelRef).then((expectedSize) => {
        if (!expectedSize || downloadDone) return;
        resolveSpinner.setTotal(100, { percent: true });
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
    downloadPollCleanup = stopDownloadPoll;

    // Re-inspect model now that cache is populated (reads real metadata).
    const modelInfo = await inspectModel(modelRef);

    // Backfill source from the original ref (resolveModel returns a local path,
    // which loses the HF origin).
    if (!modelInfo.source) {
      if (isHuggingFaceFileRef(opts.model) || isHuggingFaceRepoId(opts.model)) {
        modelInfo.source = opts.model;
      }
    }

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
        signal: controller.signal,
        onProgress: (msg) => {
          // Transition from resolve spinner to bench spinner on first
          // non-download message.
          if (!benchSpinner.isRunning() && !/Downloading model/i.test(msg)) {
            stopDownloadPoll();
            const resolveLabel = isCached
              ? `${chalk.cyan(modelInfo.display_name)} loaded from disk.`
              : `${chalk.cyan(modelInfo.display_name)} downloaded.`;
            resolveSpinner.stop(chalk.white(`[${chalk.green('✓')}] ${resolveLabel}`));

            // Display model info.
            const modelRows: [string, string][] = [
              ...(modelInfo.parameters
                ? [['Parameters', modelInfo.parameters] as [string, string]]
                : []),
              ['Format', modelInfo.format],
              ...(modelInfo.quant ? [['Quant', modelInfo.quant] as [string, string]] : []),
              ...(modelInfo.architecture
                ? [['Architecture', modelInfo.architecture] as [string, string]]
                : []),
              ...(modelInfo.artifact_sha256
                ? [['Hash', modelInfo.artifact_sha256.slice(0, 7)] as [string, string]]
                : []),
            ];
            const maxModelKey = Math.max(...modelRows.map(([k]) => k.length));
            for (const [key, value] of modelRows) {
              console.log(chalk.dim(` →  ${key.padEnd(maxModelKey)}  ${chalk.reset.cyan(value)}`));
            }
            if (!isCached) {
              const cachePath = findHfCachePath(modelRef);
              if (cachePath) {
                console.log(
                  chalk.dim(` ↳  Cached at ${log.filepath(dirname(dirname(cachePath)))}.`)
                );
              }
            }

            benchSpinner.start();
            activeSpinner = benchSpinner;
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
        if (!isCached) {
          const cachePath = findHfCachePath(modelRef);
          if (cachePath) {
            console.log(chalk.dim(` ↳  Cached at ${log.filepath(dirname(dirname(cachePath)))}.`));
          }
        }
      }

      activeSpinner = null;
      benchSpinner.stop(
        chalk.white(
          `[${chalk.green('✓')}] ${bench.trials.length}/${numTrials} trial${numTrials > 1 ? 's' : ''} ran successfully:`
        )
      );
    } catch (e: unknown) {
      stopDownloadPoll();
      if (!interrupted) {
        // Close whichever spinner is active.
        if (benchSpinner.isRunning()) {
          benchSpinner.stop(chalk.white(`[${chalk.red('✖')}] Benchmark failed.`));
        } else {
          resolveSpinner.stop(chalk.white(`[${chalk.red('✖')}] Model resolution failed.`));
        }
        log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
          prefix: chalk.dim.red(' ↳ '),
        });
      }
      throw e instanceof Error ? e : new Error(String(e));
    }

    // Re-inspect model after benchmark to pick up artifact hash and metadata
    // that may not have been available before (e.g. mlx_lm downloads the model
    // during the benchmark, so the HF cache is only populated afterwards).
    if (!modelInfo.artifact_sha256 && isHuggingFaceRepoId(modelRef)) {
      try {
        const reinspected = await inspectModel(modelRef);
        if (reinspected.artifact_sha256) modelInfo.artifact_sha256 = reinspected.artifact_sha256;
        if (reinspected.file_size_bytes) modelInfo.file_size_bytes = reinspected.file_size_bytes;
        if (reinspected.parameters) modelInfo.parameters = reinspected.parameters;
        if (reinspected.architecture) modelInfo.architecture = reinspected.architecture;
        if (reinspected.quant) modelInfo.quant = reinspected.quant;
      } catch (e: unknown) {
        // Re-inspection is best-effort; don't fail the whole run if it breaks.
        log.warn(
          chalk.yellow(
            'Failed to re-inspect model after benchmark; continuing without updated metadata.'
          )
        );
        const msg = e instanceof Error ? e.message : String(e);
        if (msg) {
          log.warn(chalk.dim(msg), {
            prefix: chalk.dim.yellow(' ↳ '),
          });
        }
      }
    }

    // Compute derived metrics.
    const metrics = computeMetrics(bench);

    // Display results.
    const resultRows: [string, string][] = [
      [
        'TTFT p50/p95',
        `${metrics.ttftP50Ms.toLocaleString()} ms / ${metrics.ttftP95Ms.toLocaleString()} ms`,
      ],
      ['Prefill TPS', `${metrics.prefillTpsMean.toLocaleString()} tok/s`],
      ['Decode TPS', `${metrics.decodeTpsMean.toLocaleString()} tok/s`],
      ...(metrics.idleRssMb > 0
        ? [['Idle Memory', `${(metrics.idleRssMb / 1_024).toFixed(2)} GB`] as [string, string]]
        : []),
      ...(metrics.peakRssMb > 0
        ? [['Peak Memory', `${(metrics.peakRssMb / 1_024).toFixed(2)} GB`] as [string, string]]
        : []),
    ];
    const maxResultKey = Math.max(...resultRows.map(([k]) => k.length));
    for (const [key, value] of resultRows) {
      console.log(chalk.dim(` →  ${key.padEnd(maxResultKey)}  ${chalk.reset.bold.cyan(value)}`));
    }

    // Create bundle.
    const bundlePath = await createBundle({
      outputDir,
      device,
      runtimeInfo,
      model: modelInfo,
      bench,
      metrics,
      notes: opts.notes,
    });

    // Validate bundle.
    const validationSpinner = new log.Spinner(chalk.dim('Validating bundle…')).start();
    activeSpinner = validationSpinner;
    const validation = await validateBundle(bundlePath);
    if (!validation.valid) {
      validationSpinner.stop(
        chalk.white(`[${chalk.red('✖')}] ${chalk.bold.red('Bundle validation failed.')}`)
      );
      for (const err of validation.errors) {
        log.error(chalk.dim(err), { prefix: chalk.dim.red(' ↳ ') });
      }
      throw new Error('Bundle validation failed.');
    }
    activeSpinner = null;
    validationSpinner.stop(chalk.white(`[${chalk.green('✓')}] Bundle is valid.`));
    console.log(chalk.dim(` ↳ Saved to ${log.filepath(bundlePath)}.`));

    // Upload bundle.
    if (opts.submit) {
      const uploadSpinner = new log.Spinner(chalk.dim('Uploading bundle…')).start();
      activeSpinner = uploadSpinner;
      try {
        const result = await uploadBundle(bundlePath, { signal: controller.signal });
        uploadSpinner.stop(
          chalk.white(`[${chalk.green('✓')}] Uploaded run: ${chalk.underline(result.run_url)}`)
        );
      } catch (e: unknown) {
        if (!interrupted) {
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
    }

    return bundlePath;
  } finally {
    process.off('SIGINT', onSigint);
  }
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
    try {
      await executeBenchmark({
        model: args.model as string,
        runtime: args.runtime as string,
        promptTokens: parsePositiveInt(
          (args['prompt-tokens'] as string) || '4096',
          'prompt-tokens'
        ),
        genTokens: parsePositiveInt((args['gen-tokens'] as string) || '1024', 'gen-tokens'),
        trials: parsePositiveInt((args.trials as string) || '10', 'trials'),
        notes: args.notes as string | undefined,
        submit: args.submit as boolean,
        output: args.output as string | undefined,
      });
      process.exit(0);
    } catch {
      process.exit(1);
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
  const { promptTokens, trials, averages } = bench;

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

  const peakRssMb = Math.round(averages.peakMemoryGb * 1024 * 10) / 10;
  const idleRssMb = Math.round(averages.idleMemoryGb * 1024 * 10) / 10;

  return {
    ttftP50Ms,
    ttftP95Ms,
    decodeTpsMean,
    prefillTpsMean,
    idleRssMb,
    peakRssMb,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function parsePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (isNaN(n) || n <= 0) {
    throw new Error(
      `Invalid value for ${chalk.bold.cyan(`--${name}`)}: "${chalk.cyan(value)}". Expected a positive integer.`
    );
  }
  return n;
}

export default command;
