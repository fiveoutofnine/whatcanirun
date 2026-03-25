import chalk from 'chalk';

import { getAuth } from './auth/token';
import { executeBenchmark } from './commands/run';
import { uploadBundle } from './upload/client';
import * as log from './utils/log';
import { Spinner } from './utils/log';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FeaturedModel {
  displayName: string;
  hfRepoId: string;
  runtime: 'mlx_lm' | 'llama.cpp';
  platform: 'darwin' | 'linux';
}

// -----------------------------------------------------------------------------
// Fallback featured models (used when API is unreachable)
// -----------------------------------------------------------------------------

const FALLBACK_MODELS: FeaturedModel[] = [
  {
    displayName: 'Qwen 3.5 0.8B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-0.8B-OptiQ-4bit',
    runtime: 'mlx_lm',
    platform: 'darwin',
  },
  {
    displayName: 'Qwen 3.5 4B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-4B-MLX-4bit',
    runtime: 'mlx_lm',
    platform: 'darwin',
  },
  {
    displayName: 'Qwen 3.5 9B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-9B-MLX-4bit',
    runtime: 'mlx_lm',
    platform: 'darwin',
  },
  {
    displayName: 'Llama 3.1 8B Instruct (4-bit)',
    hfRepoId: 'mlx-community/Meta-Llama-3.1-8B-Instruct-4bit',
    runtime: 'mlx_lm',
    platform: 'darwin',
  },
  {
    displayName: 'Qwen 3.5 4B (GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-4B-GGUF',
    runtime: 'llama.cpp',
    platform: 'linux',
  },
  {
    displayName: 'Qwen 3.5 9B (GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-9B-GGUF',
    runtime: 'llama.cpp',
    platform: 'linux',
  },
];

// -----------------------------------------------------------------------------
// Fetch featured models
// -----------------------------------------------------------------------------

const API_BASE = process.env.WCIR_API_URL || 'https://whatcani.run';

async function fetchFeaturedModels(): Promise<FeaturedModel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${API_BASE}/api/v0/featured`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return FALLBACK_MODELS;
    return (await resp.json()) as FeaturedModel[];
  } catch {
    return FALLBACK_MODELS;
  }
}

// -----------------------------------------------------------------------------
// Arrow-key picker
// -----------------------------------------------------------------------------

function pick(items: string[], defaultIndex = 0): Promise<number> {
  return new Promise((resolve) => {
    let cursor = defaultIndex;
    const { stdin, stdout } = process;

    function render() {
      if (renderCount > 0) {
        stdout.write(`\x1b[${items.length}A`);
      }
      for (let i = 0; i < items.length; i++) {
        const label = items[i]!;
        const isDefault = i === defaultIndex;
        const tag = isDefault ? chalk.dim(' (default)') : '';
        if (i === cursor) {
          stdout.write(`\x1b[2K ${chalk.cyan('❯')} ${chalk.bold.cyan(label)}${tag}\n`);
        } else {
          stdout.write(`\x1b[2K   ${chalk.dim(label)}${tag}\n`);
        }
      }
      renderCount++;
    }

    let renderCount = 0;

    function onData(data: Buffer) {
      const key = data.toString();

      if (key === '\x1b[A' || key === 'k') {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
        return;
      }
      if (key === '\x1b[B' || key === 'j') {
        cursor = (cursor + 1) % items.length;
        render();
        return;
      }
      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(cursor);
        return;
      }
      if (key === '\x03' || key === 'q' || key === '\x1b') {
        cleanup();
        resolve(-1);
        return;
      }
    }

    function cleanup() {
      stdin.removeListener('data', onData);
      if (stdin.isTTY) stdin.setRawMode(false);
    }

    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);

    render();
  });
}

// -----------------------------------------------------------------------------
// Interactive mode
// -----------------------------------------------------------------------------

export async function runInteractive(): Promise<void> {
  const platform = process.platform;
  const runtime = platform === 'darwin' ? 'mlx_lm' : 'llama.cpp';
  const platformLabel = platform === 'darwin' ? 'macOS (MLX)' : 'Linux (CUDA)';

  // Fetch and filter models for this platform.
  const allModels = await fetchFeaturedModels();
  const models = allModels.filter((m) => m.platform === platform);

  if (models.length === 0) {
    log.error(`No featured models available for ${chalk.cyan(platform)}.`);
    console.log(
      chalk.dim(
        `Run a benchmark directly with: ${chalk.bold.cyan('whatcanirun run --model <model> --runtime <runtime>')}`
      )
    );
    process.exit(1);
  }

  // Header.
  console.log();
  console.log(chalk.bold('whatcanirun') + chalk.dim(' — interactive mode'));
  console.log();
  console.log(chalk.dim(`Platform:  ${chalk.reset.cyan(platformLabel)}`));
  console.log(chalk.dim(`Runtime:   ${chalk.reset.cyan(runtime)}`));
  console.log();

  // Pick model.
  console.log(chalk.white('Select a model to benchmark:') + chalk.dim('  (↑↓ to move, enter to select, q to quit)'));
  console.log();

  const choice = await pick(models.map((m) => m.displayName));

  if (choice < 0) {
    console.log();
    process.exit(0);
  }

  const selected = models[choice]!;

  // Ask to submit before running.
  const auth = getAuth();
  const submitHint = auth
    ? `  (as ${chalk.cyan(auth.user.name)} <${chalk.cyan(auth.user.email)}>, publicly visible)`
    : '  (anonymous, publicly visible)';
  console.log();
  console.log(chalk.white('Submit results to whatcani.run?') + chalk.dim(submitHint));
  console.log();

  const submitChoice = await pick(['Yes, submit', 'No, skip']);
  const shouldSubmit = submitChoice === 0;

  // Run benchmark.
  console.log();
  console.log(chalk.dim(`Benchmarking ${chalk.reset.bold.cyan(selected.displayName)}…`));
  console.log();

  const bundlePath = await executeBenchmark({
    model: selected.hfRepoId,
    runtime: selected.runtime,
  });

  // Upload if requested.
  if (shouldSubmit) {
    const uploadSpinner = new Spinner(chalk.dim('Uploading bundle…')).start();
    try {
      const result = await uploadBundle(bundlePath);
      uploadSpinner.stop(
        chalk.white(`[${chalk.green('✓')}] Uploaded run: ${chalk.underline(result.run_url)}`)
      );
    } catch (e: unknown) {
      uploadSpinner.stop(chalk.white(`[${chalk.red('✖')}] Upload failed.`));
      log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
        prefix: chalk.dim.red(' ↳ '),
      });
    }
  }

  process.exit(0);
}
