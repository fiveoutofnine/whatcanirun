import chalk from 'chalk';

import { getAuth } from './auth/token';
import { executeBenchmark } from './commands/run';
import { resolveRuntime } from './runtime/resolve';
import type { RuntimeInfo } from './runtime/types';
import { uploadBundle } from './upload/client';
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
    displayName: 'Qwen 3.5 4B (Q4_K_M GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-4B-GGUF',
    hfFileName: 'Qwen3.5-4B-Q4_K_M.gguf',
    runtime: 'llama.cpp',
    platform: 'linux',
  },
  {
    displayName: 'Qwen 3.5 4B (Q4_K_M GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-4B-GGUF',
    hfFileName: 'Qwen3.5-4B-Q4_K_M.gguf',
    runtime: 'llama.cpp',
    platform: 'darwin',
  },
  {
    displayName: 'Qwen 3.5 9B (Q4_K_M GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-9B-GGUF',
    hfFileName: 'Qwen3.5-9B-Q4_K_M.gguf',
    runtime: 'llama.cpp',
    platform: 'linux',
  },
  {
    displayName: 'Qwen 3.5 9B (Q4_K_M GGUF)',
    hfRepoId: 'unsloth/Qwen3.5-9B-GGUF',
    hfFileName: 'Qwen3.5-9B-Q4_K_M.gguf',
    runtime: 'llama.cpp',
    platform: 'darwin',
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
// Arrow-key picker (vertical list)
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
    }

    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);

    render();
  });
}

// -----------------------------------------------------------------------------
// Horizontal yes/no picker (left/right arrow keys)
// -----------------------------------------------------------------------------

function pickYesNo(defaultYes = true): Promise<boolean | null> {
  return new Promise((resolve) => {
    let yes = defaultYes;
    const { stdin, stdout } = process;

    function render() {
      stdout.write('\x1b[2K\r');
      if (yes) {
        stdout.write(`   ${chalk.cyan('❯ Yes')}  ${chalk.dim('No')}`);
      } else {
        stdout.write(`     ${chalk.dim('Yes')}  ${chalk.cyan('❯ No')}`);
      }
    }

    function onData(data: Buffer) {
      const key = data.toString();

      if (key === '\x1b[D' || key === '\x1b[A' || key === 'h' || key === 'k') {
        yes = true;
        render();
        return;
      }
      if (key === '\x1b[C' || key === '\x1b[B' || key === 'l' || key === 'j') {
        yes = false;
        render();
        return;
      }
      if (key === '\r' || key === '\n') {
        stdout.write('\n');
        cleanup();
        resolve(yes);
        return;
      }
      if (key === '\x03' || key === 'q' || key === '\x1b') {
        stdout.write('\n');
        cleanup();
        resolve(null);
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
// GGUF model resolution
// -----------------------------------------------------------------------------

/**
 * For llama.cpp models, download the specific GGUF file from HuggingFace
 * and return the local path. Uses `huggingface-cli download` which caches
 * files in the standard HF cache directory.
 */
async function resolveGgufModel(model: FeaturedModel): Promise<string> {
  if (!model.hfFileName) {
    return model.hfRepoId;
  }

  const proc = Bun.spawn(['huggingface-cli', 'download', model.hfRepoId, model.hfFileName], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = (await new Response(proc.stdout).text()).trim();
  const stderr = (await new Response(proc.stderr).text()).trim();
  const code = await proc.exited;

  if (code !== 0) {
    throw new Error(
      `Failed to download ${model.hfRepoId}/${model.hfFileName}:\n${stderr || stdout}`
    );
  }

  // huggingface-cli download prints the local cache path on stdout.
  const localPath = stdout.split('\n').pop()!.trim();
  if (!localPath) {
    throw new Error(
      `huggingface-cli returned empty path for ${model.hfRepoId}/${model.hfFileName}`
    );
  }

  return localPath;
}

// -----------------------------------------------------------------------------
// Interactive mode
// -----------------------------------------------------------------------------

export async function runInteractive(): Promise<void> {
  const platform = process.platform;

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
  const detectSpinner = new Spinner(chalk.dim('Detecting runtimes…')).start();
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
  const models = allModels.filter(
    (m) => m.runtime === selectedRuntime.name && m.platform === platform
  );
  activeSpinner = null;
  fetchSpinner.stop();

  if (models.length === 0) {
    log.error(
      `No featured models for ${chalk.cyan(selectedRuntime.name)} on ${chalk.cyan(platform)}.`
    );
    console.log(
      chalk.dim(
        ` ↳ Run a benchmark manually with ${chalk.bold.cyan(`${binName()} run --model <model> --runtime ${selectedRuntime.name}`)}`
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
    ? `  (as ${chalk.cyan(auth.user.name)} <${chalk.cyan(auth.user.email)}>, publicly visible)`
    : '  (anonymous, publicly visible)';
  console.log(chalk.white('Submit results to whatcani.run?') + chalk.dim(submitHint));

  const shouldSubmit = await pickYesNo();

  if (shouldSubmit === null) {
    console.log();
    process.exit(0);
  }

  // Resolve model path (download GGUF file if needed).
  let modelRef = selected.hfRepoId;
  if (selected.runtime === 'llama.cpp' && selected.hfFileName) {
    const downloadSpinner = new Spinner(
      chalk.dim(`Downloading ${chalk.reset.cyan(selected.hfFileName)}…`)
    ).start();
    activeSpinner = downloadSpinner;
    try {
      modelRef = await resolveGgufModel(selected);
      activeSpinner = null;
      downloadSpinner.stop(
        chalk.white(`[${chalk.green('✓')}] Downloaded ${chalk.cyan(selected.hfFileName)}.`)
      );
    } catch (e: unknown) {
      downloadSpinner.stop(chalk.white(`[${chalk.red('✖')}] Download failed.`));
      log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
        prefix: chalk.dim.red(' ↳ '),
      });
      process.exit(1);
    }
  }

  // Run benchmark.
  console.log();
  console.log(chalk.dim(`Benchmarking ${chalk.reset.bold.cyan(selected.displayName)}…`));
  console.log();

  const bundlePath = await executeBenchmark({
    model: modelRef,
    runtime: selected.runtime,
  });

  // Upload if requested.
  if (shouldSubmit) {
    const uploadSpinner = new Spinner(chalk.dim('Uploading bundle…')).start();
    activeSpinner = uploadSpinner;
    try {
      const result = await uploadBundle(bundlePath);
      activeSpinner = null;
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
