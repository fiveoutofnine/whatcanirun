import chalk from 'chalk';
import { defineCommand } from 'citty';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { executeBenchmark, parsePositiveInt } from './run';
import { canManageLlamaCppRuntime, ensureManagedLlamaCppInstalled } from '../runtime/install';
import { uploadBundle, uploadBundleWithReward } from '../upload/client';
import { DEFAULT_BATCHES_DIR } from '../utils/id';
import * as log from '../utils/log';

interface ModelSpec {
  model: string;
  runtime: string;
  promptTokens: number;
  genTokens: number;
  trials: number;
  notes?: string;
}

function coerceOptionalPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function firstNonEmptyString(
  data: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function toModelSpec(
  raw: unknown,
  defaults: Omit<ModelSpec, 'model'>
): ModelSpec {
  if (typeof raw === 'string') {
    return { ...defaults, model: raw };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Unsupported model entry: ${JSON.stringify(raw)}`);
  }

  const data = raw as Record<string, unknown>;
  const model = firstNonEmptyString(data, ['model', 'source', 'ref']);
  if (!model) {
    throw new Error(`Model entry is missing "model": ${JSON.stringify(raw)}`);
  }

  return {
    model,
    runtime:
      typeof data.runtime === 'string' && data.runtime.trim().length > 0
        ? data.runtime.trim()
        : defaults.runtime,
    promptTokens:
      coerceOptionalPositiveInt(data.prompt_tokens) ??
      coerceOptionalPositiveInt(data.promptTokens) ??
      defaults.promptTokens,
    genTokens:
      coerceOptionalPositiveInt(data.gen_tokens) ??
      coerceOptionalPositiveInt(data.genTokens) ??
      defaults.genTokens,
    trials: coerceOptionalPositiveInt(data.trials) ?? defaults.trials,
    notes:
      typeof data.notes === 'string' && data.notes.trim().length > 0
        ? data.notes.trim()
        : defaults.notes,
  };
}

function parseSourceFile(filePath: string, defaults: Omit<ModelSpec, 'model'>): ModelSpec[] {
  const content = readFileSync(filePath, 'utf-8');
  const suffix = filePath.toLowerCase();

  if (suffix.endsWith('.json')) {
    const parsed = JSON.parse(content) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.map((item) => toModelSpec(item, defaults));
  }

  if (suffix.endsWith('.jsonl')) {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => toModelSpec(JSON.parse(line), defaults));
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => toModelSpec(line, defaults));
}

function parseInlineSources(input: string, defaults: Omit<ModelSpec, 'model'>): ModelSpec[] {
  const trimmed = input.trim();
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown[];
    return parsed.map((item) => toModelSpec(item, defaults));
  }

  if (trimmed.startsWith('{')) {
    return [toModelSpec(JSON.parse(trimmed), defaults)];
  }

  return trimmed
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => toModelSpec(item, defaults));
}

function parseModelSources(input: string, defaults: Omit<ModelSpec, 'model'>): ModelSpec[] {
  const expanded = resolve(input);
  if (existsSync(expanded)) {
    return parseSourceFile(expanded, defaults);
  }
  return parseInlineSources(input, defaults);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function ensureBatchRuntimeReady(specs: ModelSpec[]): Promise<void> {
  const needsManagedLlamaCpp =
    canManageLlamaCppRuntime() && specs.some((spec) => spec.runtime === 'llama.cpp');
  if (!needsManagedLlamaCpp) return;

  const spinner = new log.Spinner(chalk.dim('Preparing llama.cpp runtime…')).start();
  try {
    await ensureManagedLlamaCppInstalled();
    spinner.stop(chalk.white(`[${chalk.green('✓')}] Managed llama.cpp runtime is ready.`));
  } catch (e: unknown) {
    spinner.stop(chalk.white(`[${chalk.red('✖')}] Failed to prepare llama.cpp runtime.`));
    log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
      prefix: chalk.dim.red(' ↳ '),
    });
    process.exit(1);
  }
}

async function submitBundle(bundlePath: string, reward: boolean): Promise<void> {
  const spinner = new log.Spinner(chalk.dim('Uploading bundle…')).start();
  try {
    const result = reward
      ? await uploadBundleWithReward(bundlePath)
      : await uploadBundle(bundlePath);
    spinner.stop(chalk.white(`[${chalk.green('✓')}] Uploaded run: ${chalk.underline(result.run_url)}`));
  } catch (e: unknown) {
    spinner.stop(chalk.white(`[${chalk.red('✖')}] Run upload failed.`));
    throw e;
  }
}

const command = defineCommand({
  meta: {
    name: 'batch',
    description: 'Run a batch of benchmarks from model source strings or a source file',
  },
  args: {
    'model-sources': {
      type: 'string',
      description:
        'Path to a .txt/.json/.jsonl source file, a JSON array, or a comma/newline-separated list of model source strings',
      required: true,
    },
    runtime: {
      type: 'string',
      description: 'Default runtime to use for entries without an explicit runtime',
    },
    'prompt-tokens': {
      type: 'string',
      description: 'Default prompt token count (default: 4,096)',
    },
    'gen-tokens': {
      type: 'string',
      description: 'Default generation token count (default: 1,024)',
    },
    trials: {
      type: 'string',
      description: 'Default number of trials (default: 10)',
    },
    notes: {
      type: 'string',
      description: 'Default notes attached to every run',
    },
    'max-models': {
      type: 'string',
      description: 'Only process the first N model entries',
    },
    'batch-label': {
      type: 'string',
      description: 'Optional label for the batch output directory',
    },
    output: {
      type: 'string',
      description: 'Batch output root directory (default: ~/.whatcanirun/batches)',
    },
    'no-submit': {
      type: 'boolean',
      description: 'Benchmark only; do not upload runs',
      default: false,
    },
    reward: {
      type: 'boolean',
      description: 'Receive rewards for submitted runs',
      default: false,
    },
    'stop-on-error': {
      type: 'boolean',
      description: 'Abort the batch on the first failed model',
      default: false,
    },
  },
  async run({ args }) {
    const defaults: Omit<ModelSpec, 'model'> = {
      runtime: (args.runtime as string) || 'llama.cpp',
      promptTokens: parsePositiveInt((args['prompt-tokens'] as string) || '4096', 'prompt-tokens'),
      genTokens: parsePositiveInt((args['gen-tokens'] as string) || '1024', 'gen-tokens'),
      trials: parsePositiveInt((args.trials as string) || '10', 'trials'),
      notes: (args.notes as string | undefined) || undefined,
    };

    const maxModels = args['max-models']
      ? parsePositiveInt(args['max-models'] as string, 'max-models')
      : 0;
    const batchLabel =
      ((args['batch-label'] as string | undefined) || '').trim() ||
      new Date().toISOString().replace(/[:.]/g, '-');
    const batchRoot = resolve((args.output as string) || DEFAULT_BATCHES_DIR);

    let specs = parseModelSources(args['model-sources'] as string, defaults);
    if (maxModels > 0) {
      specs = specs.slice(0, maxModels);
    }
    if (specs.length === 0) {
      log.error('No model sources found.');
      process.exit(1);
    }

    await ensureBatchRuntimeReady(specs);

    const batchDir = resolve(batchRoot, batchLabel);
    mkdirSync(batchDir, { recursive: true });

    console.log(
      chalk.dim(
        `Running ${chalk.cyan(String(specs.length))} benchmark${specs.length === 1 ? '' : 's'} from batch ${chalk.cyan(batchLabel)}.`
      )
    );
    console.log(chalk.dim(` ↳ Output: ${log.filepath(batchDir)}`));
    console.log();

    const results: Array<Record<string, unknown>> = [];
    for (let index = 0; index < specs.length; index++) {
      const spec = specs[index]!;
      const outputDir = resolve(batchDir, `${String(index + 1).padStart(3, '0')}-${slugify(spec.model)}`);
      mkdirSync(outputDir, { recursive: true });

      const startedAt = Date.now();
      console.log(
        chalk.white(
          `[${chalk.cyan(String(index + 1))}/${chalk.cyan(String(specs.length))}] ${chalk.cyan(spec.model)}`
        )
      );

      try {
        const bundlePath = await executeBenchmark({
          model: spec.model,
          runtime: spec.runtime,
          promptTokens: spec.promptTokens,
          genTokens: spec.genTokens,
          trials: spec.trials,
          notes: spec.notes,
          output: outputDir,
          submit: false,
        });

        if (!(args['no-submit'] as boolean)) {
          await submitBundle(bundlePath, args.reward as boolean);
        }

        results.push({
          bundlePath,
          durationSeconds: Math.round((Date.now() - startedAt) / 10) / 100,
          model: spec.model,
          runtime: spec.runtime,
          status: args['no-submit'] ? 'benchmarked' : 'submitted',
        });
      } catch (e: unknown) {
        log.error(e instanceof Error ? e.message : String(e));
        results.push({
          durationSeconds: Math.round((Date.now() - startedAt) / 10) / 100,
          error: e instanceof Error ? e.message : String(e),
          model: spec.model,
          runtime: spec.runtime,
          status: 'failed',
        });
        if (args['stop-on-error'] as boolean) {
          break;
        }
      }

      console.log();
    }

    const summaryPath = resolve(batchDir, 'summary.json');
    writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          batchId: batchLabel,
          createdAt: new Date().toISOString(),
          results,
        },
        null,
        2
      ) + '\n'
    );

    console.log(chalk.white(`[${chalk.green('✓')}] Batch summary saved to ${log.filepath(summaryPath)}.`));
  },
});

export default command;
