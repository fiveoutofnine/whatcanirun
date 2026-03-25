import chalk from 'chalk';

import { getAuth } from './auth/token';
import { executeBenchmark } from './commands/run';
import { resolveRuntime } from './runtime/resolve';
import type { RuntimeInfo } from './runtime/types';
import { binName } from './utils/bin';
import * as log from './utils/log';
import { Spinner } from './utils/log';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FeaturedModel {
  displayName: string;
  hfRepoId: string;
  hfFileName?: string;
  runtime: 'mlx_lm' | 'llama.cpp';
}

// -----------------------------------------------------------------------------
// Fallback featured models (used when API is unreachable)
// -----------------------------------------------------------------------------

const FALLBACK_MODELS: FeaturedModel[] = [
  {
    displayName: 'Qwen 3.5 0.8B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-0.8B-OptiQ-4bit',
    runtime: 'mlx_lm',
  },
  {
    displayName: 'Qwen 3.5 4B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-4B-MLX-4bit',
    runtime: 'mlx_lm',
  },
  {
    displayName: 'Qwen 3.5 9B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-9B-MLX-4bit',
    runtime: 'mlx_lm',
  },
  {
    displayName: 'Llama 3.1 8B Instruct (4-bit)',
    hfRepoId: 'mlx-community/Meta-Llama-3.1-8B-Instruct-4bit',
    runtime: 'mlx_lm',
  },
  {
    displayName: 'Qwen 3.5 0.8B (Q4_K_M GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-0.8B-GGUF',
    hfFileName: 'Qwen3.5-0.8B-Q4_K_M.gguf',
    runtime: 'llama.cpp',
  },
  {
    displayName: 'Qwen 3.5 4B (Q4_K_M GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-4B-GGUF',
    hfFileName: 'Qwen3.5-4B-Q4_K_M.gguf',
    runtime: 'llama.cpp',
  },
  {
    displayName: 'Qwen 3.5 9B (Q4_K_M GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-9B-GGUF',
    hfFileName: 'Qwen3.5-9B-Q4_K_M.gguf',
    runtime: 'llama.cpp',
  },
];

// -----------------------------------------------------------------------------
// Fetch featured models
// -----------------------------------------------------------------------------

const API_BASE = process.env.WCIR_API_URL || 'https://whatcani.run';

function isFeaturedModel(item: unknown): item is FeaturedModel {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.displayName === 'string' &&
    typeof obj.hfRepoId === 'string' &&
    (obj.hfFileName === undefined || typeof obj.hfFileName === 'string') &&
    (obj.runtime === 'mlx_lm' || obj.runtime === 'llama.cpp')
  );
}

async function fetchFeaturedModels(): Promise<FeaturedModel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${API_BASE}/api/v0/featured`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return FALLBACK_MODELS;
    const data: unknown = await resp.json();
    if (!Array.isArray(data) || !data.every(isFeaturedModel)) return FALLBACK_MODELS;
    return data;
  } catch {
    return FALLBACK_MODELS;
  }
}

// -----------------------------------------------------------------------------
// Arrow-key picker (vertical list)
// -----------------------------------------------------------------------------

function pick(items: string[], defaultIndex = 0): Promise<number> {
  if (!process.stdin.isTTY) {
    return Promise.resolve(defaultIndex);
  }

  return new Promise((resolve) => {
    let cursor = defaultIndex;
    const { stdin, stdout } = process;

    function render() {
      if (renderCount > 0) {
        stdout.write(`\x1b[${items.length}A`);
      }
      for (let i = 0; i < items.length; i++) {
        const label = items[i]!;
        if (i === cursor) {
          stdout.write(`\x1b[2K${chalk.cyan('❯')} ${chalk.cyan(label)}\n`);
        } else {
          stdout.write(`\x1b[2K  ${chalk.dim(label)}\n`);
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
      stdin.pause();
    }

    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);

    render();
  });
}

// -----------------------------------------------------------------------------
// Runtime detection
// -----------------------------------------------------------------------------

interface DetectedRuntime {
  name: string;
  info: RuntimeInfo;
}

const RUNTIME_NAMES = ['mlx_lm', 'llama.cpp'] as const;

const INSTALL_HINTS: Record<string, string> = {
  mlx_lm: `${chalk.bold.cyan('brew install mlx-lm')} or ${chalk.bold.cyan('pip install mlx-lm')}`,
  'llama.cpp': `${chalk.bold.cyan('brew install llama.cpp')}`,
};

async function detectRuntimes(): Promise<DetectedRuntime[]> {
  const detected: DetectedRuntime[] = [];
  for (const name of RUNTIME_NAMES) {
    try {
      const adapter = resolveRuntime(name);
      const info = await adapter.detect();
      if (info) detected.push({ name, info });
    } catch {
      // Skip runtimes that fail detection.
    }
  }
  return detected;
}

// -----------------------------------------------------------------------------
// Interactive mode
// -----------------------------------------------------------------------------

export async function runInteractive(): Promise<void> {
  // Graceful Ctrl+C handling.
  let activeSpinner: Spinner | null = null;

  const onSigint = () => {
    if (activeSpinner?.isRunning()) {
      activeSpinner.stop(chalk.white(`[${chalk.gray('−')}] ${chalk.yellow('Interrupted ⚠')}`));
    }
    console.log();
    process.exit(130);
  };
  process.on('SIGINT', onSigint);

  // Detect available runtimes.
  const detectSpinner = new Spinner(chalk.dim('Detecting runtimes on your system…')).start();
  activeSpinner = detectSpinner;
  let runtimes: DetectedRuntime[];
  try {
    runtimes = await detectRuntimes();
    if (runtimes.length === 0) {
      detectSpinner.stop(
        chalk.white(
          `[${chalk.red('✖')}] No supported runtimes found. Install one of the following:`
        )
      );
      for (const name of RUNTIME_NAMES) {
        console.log(chalk.dim(` ↳ ${chalk.cyan(name)}: ${INSTALL_HINTS[name]}`));
      }
      process.exit(1);
    }
    activeSpinner = null;
    detectSpinner.stop(
      chalk.white(
        `[${chalk.green('✓')}] Found ${chalk.cyan(String(runtimes.length))} supported runtime${runtimes.length > 1 ? 's' : ''}.`
      )
    );
  } catch (e: unknown) {
    detectSpinner.stop(chalk.white(`[${chalk.red('✖')}] Runtime detection failed.`));
    log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
      prefix: chalk.dim.red(' ↳ '),
    });
    process.exit(1);
  }

  let selectedRuntime: DetectedRuntime;

  if (runtimes.length === 1) {
    selectedRuntime = runtimes[0]!;
    console.log(
      chalk.dim(
        ` ↳ Using ${chalk.cyan(selectedRuntime.info.name)} (${chalk.cyan(selectedRuntime.info.version)}).`
      )
    );
    console.log();
  } else {
    console.log();
    console.log(
      chalk.white('Select a runtime') + chalk.dim('  (↑/↓ to move · enter to select · q to quit)')
    );

    const runtimeChoice = await pick(runtimes.map((r) => `${r.info.name} (${r.info.version})`));
    if (runtimeChoice < 0) process.exit(0);
    selectedRuntime = runtimes[runtimeChoice]!;
  }

  // Fetch and filter models for this runtime.
  const fetchSpinner = new Spinner(chalk.dim('Fetching models…')).start();
  activeSpinner = fetchSpinner;
  const allModels = await fetchFeaturedModels();
  const models = allModels.filter((m) => m.runtime === selectedRuntime.name);
  activeSpinner = null;
  fetchSpinner.stop();

  if (models.length === 0) {
    if (runtimes.length > 1) console.log();
    log.error(`No featured models for ${chalk.cyan(selectedRuntime.name)}.`);
    console.log(
      chalk.dim(
        `↳ Run a benchmark manually with ${chalk.bold.cyan(`${binName()} run --model <model> --runtime ${selectedRuntime.name}`)}`
      )
    );
    process.exit(1);
  }

  console.log(chalk.white('Select a model to benchmark'));

  const choice = await pick(models.map((m) => m.displayName));
  if (choice < 0) process.exit(0);

  const selected = models[choice]!;

  // Ask to submit before running.
  const auth = getAuth();
  const submitHint = auth
    ? `  (as ${chalk.cyan(auth.user.name)} (${chalk.cyan(auth.user.email)}), publicly visible)`
    : '  (anonymous, publicly visible)';
  const wcirLink = `\x1b]8;;https://whatcani.run\x07${chalk.underline('whatcani.run')}\x1b]8;;\x07`;
  console.log(chalk.white(`Submit results to ${wcirLink}?`) + chalk.dim(submitHint));

  const submitChoice = await pick(['Yes, submit', 'No, submit later']);
  if (submitChoice < 0) process.exit(0);
  const shouldSubmit = submitChoice === 0;

  // Build model ref — for GGUF repos with a specific file, use "repoId:fileName"
  // so that resolveModel handles the download during benchmark execution.
  const modelRef = selected.hfFileName
    ? `${selected.hfRepoId}:${selected.hfFileName}`
    : selected.hfRepoId;

  // Run benchmark.
  // Remove our SIGINT handler — executeBenchmark registers its own for cleanup.
  process.off('SIGINT', onSigint);

  console.log();
  console.log(
    chalk.dim(
      'Benchmarking ' +
        chalk.reset.cyan(selected.displayName) +
        chalk.dim(' with ' + chalk.reset.cyan(selected.runtime)) +
        chalk.dim('.')
    )
  );
  console.log();

  try {
    await executeBenchmark({
      model: modelRef,
      runtime: selected.runtime,
      submit: shouldSubmit,
    });
  } catch {
    process.exit(1);
  }

  process.exit(0);
}
