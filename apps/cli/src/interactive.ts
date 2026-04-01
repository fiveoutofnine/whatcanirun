import { MODEL_CATALOG } from '@whatcanirun/shared';
import type { CatalogModel } from '@whatcanirun/shared';
import chalk from 'chalk';

import { getAuth } from './auth/token';
import { executeBenchmark } from './commands/run';
import { resolveRuntime } from './runtime/resolve';
import type { RuntimeInfo } from './runtime/types';
import { binName } from './utils/bin';
import * as log from './utils/log';
import { Spinner } from './utils/log';

// -----------------------------------------------------------------------------
// Model catalog helpers
// -----------------------------------------------------------------------------

function displayName(m: CatalogModel): string {
  return `${m.name} (${m.quant})`;
}

function modelRef(m: CatalogModel): string {
  return m.hfFileName ? `${m.id}:${m.hfFileName}` : m.id;
}

function filterCatalog(models: CatalogModel[], query: string): CatalogModel[] {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  return models.filter((m) => {
    const haystack = `${m.name} ${m.id} ${m.family} ${m.params} ${m.quant}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
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
          stdout.write(`\x1b[2K${chalk.cyan('>')} ${chalk.cyan(label)}\n`);
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
// Searchable model picker
// -----------------------------------------------------------------------------

const MAX_VISIBLE = 10;

function searchPick(models: CatalogModel[]): Promise<CatalogModel | null> {
  if (!process.stdin.isTTY) {
    return Promise.resolve(models[0] ?? null);
  }

  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    let query = '';
    let cursor = 0;
    let items = models;
    let prevLineCount = 0;

    function render() {
      if (prevLineCount > 0) {
        stdout.write(`\x1b[${prevLineCount}A`);
      }

      const prompt = query
        ? `${chalk.cyan('>')} ${chalk.white(query)}`
        : `${chalk.cyan('>')} ${chalk.dim('Type to filter...')}`;
      stdout.write(`\x1b[2K${prompt}\n`);

      const visible = items.slice(0, MAX_VISIBLE);
      let lineCount = 1;
      for (let i = 0; i < visible.length; i++) {
        const model = visible[i]!;
        const label = `${displayName(model)}  ${chalk.dim(model.id)}`;
        if (i === cursor) {
          stdout.write(`\x1b[2K  ${chalk.cyan('>')} ${chalk.cyan(displayName(model))}  ${chalk.dim(model.id)}\n`);
        } else {
          stdout.write(`\x1b[2K    ${chalk.dim(label)}\n`);
        }
        lineCount++;
      }

      if (items.length === 0 && query) {
        stdout.write(`\x1b[2K  ${chalk.dim('No models found')}\n`);
        lineCount++;
      } else if (items.length > MAX_VISIBLE) {
        stdout.write(
          `\x1b[2K  ${chalk.dim(`... and ${items.length - MAX_VISIBLE} more`)}\n`
        );
        lineCount++;
      }

      const extraLines = prevLineCount - lineCount;
      for (let i = 0; i < extraLines; i++) {
        stdout.write(`\x1b[2K\n`);
      }
      if (extraLines > 0) {
        stdout.write(`\x1b[${extraLines}A`);
      }

      prevLineCount = lineCount;
    }

    function applyFilter() {
      if (!query) {
        items = models;
      } else {
        items = filterCatalog(models, query);
      }
      cursor = 0;
      render();
    }

    function onData(data: Buffer) {
      const key = data.toString();

      if (key === '\x1b[A') {
        if (items.length > 0) {
          cursor = (cursor - 1 + Math.min(items.length, MAX_VISIBLE)) %
            Math.min(items.length, MAX_VISIBLE);
          render();
        }
        return;
      }
      if (key === '\x1b[B') {
        if (items.length > 0) {
          cursor = (cursor + 1) % Math.min(items.length, MAX_VISIBLE);
          render();
        }
        return;
      }
      if (key === '\r' || key === '\n') {
        if (items.length > 0) {
          cleanup();
          resolve(items[cursor] ?? null);
        }
        return;
      }
      if (key === '\x03' || key === '\x1b') {
        cleanup();
        resolve(null);
        return;
      }
      if (key === '\x7f' || key === '\b') {
        if (query.length > 0) {
          query = query.slice(0, -1);
          applyFilter();
        }
        return;
      }
      if (key.length === 1 && key >= ' ') {
        query += key;
        applyFilter();
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
  let activeSpinner: Spinner | null = null;

  const onSigint = () => {
    if (activeSpinner?.isRunning()) {
      activeSpinner.stop(chalk.white(`[${chalk.gray('-')}] ${chalk.yellow('Interrupted')}`));
    }
    console.log();
    process.exit(130);
  };
  process.on('SIGINT', onSigint);

  // Detect available runtimes.
  const detectSpinner = new Spinner(chalk.dim('Detecting runtimes on your system...')).start();
  activeSpinner = detectSpinner;
  let runtimes: DetectedRuntime[];
  try {
    runtimes = await detectRuntimes();
    if (runtimes.length === 0) {
      detectSpinner.stop(
        chalk.white(
          `[${chalk.red('x')}] No supported runtimes found. Install one of the following:`
        )
      );
      for (const name of RUNTIME_NAMES) {
        console.log(chalk.dim(` -> ${chalk.cyan(name)}: ${INSTALL_HINTS[name]}`));
      }
      process.exit(1);
    }
    activeSpinner = null;
    detectSpinner.stop(
      chalk.white(
        `[${chalk.green('ok')}] Found ${chalk.cyan(String(runtimes.length))} supported runtime${runtimes.length > 1 ? 's' : ''}.`
      )
    );
  } catch (e: unknown) {
    detectSpinner.stop(chalk.white(`[${chalk.red('x')}] Runtime detection failed.`));
    log.error(chalk.dim(e instanceof Error ? e.message : String(e)), {
      prefix: chalk.dim.red(' -> '),
    });
    process.exit(1);
  }

  let selectedRuntime: DetectedRuntime;

  if (runtimes.length === 1) {
    selectedRuntime = runtimes[0]!;
    console.log(
      chalk.dim(
        ` -> Using ${chalk.cyan(selectedRuntime.info.name)} (${chalk.cyan(selectedRuntime.info.version)}).`
      )
    );
    console.log();
  } else {
    console.log();
    console.log(
      chalk.white('Select a runtime') + chalk.dim('  (arrows to move - enter to select - q to quit)')
    );

    const runtimeChoice = await pick(runtimes.map((r) => `${r.info.name} (${r.info.version})`));
    if (runtimeChoice < 0) process.exit(0);
    selectedRuntime = runtimes[runtimeChoice]!;
  }

  // Filter bundled catalog by runtime.
  const models = (MODEL_CATALOG as CatalogModel[]).filter(
    (m) => m.runtime === selectedRuntime.name
  );

  if (models.length === 0) {
    log.error(`No models for ${chalk.cyan(selectedRuntime.name)}.`);
    console.log(
      chalk.dim(
        `-> Run a benchmark manually with ${chalk.bold.cyan(`${binName()} run --model <model> --runtime ${selectedRuntime.name}`)}`
      )
    );
    process.exit(1);
  }

  console.log(
    chalk.white('Select a model to benchmark') +
      chalk.dim(`  (type to filter ${chalk.cyan(String(models.length))} models - arrows to move - enter to select)`)
  );

  const selected = await searchPick(models);
  if (!selected) process.exit(0);

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

  const ref = modelRef(selected);

  // Remove our SIGINT handler - executeBenchmark registers its own for cleanup.
  process.off('SIGINT', onSigint);

  console.log();
  console.log(
    chalk.dim(
      'Benchmarking ' +
        chalk.reset.cyan(displayName(selected)) +
        chalk.dim(' with ' + chalk.reset.cyan(selected.runtime)) +
        chalk.dim('.')
    )
  );
  console.log();

  try {
    await executeBenchmark({
      model: ref,
      runtime: selected.runtime,
      submit: shouldSubmit,
    });
  } catch {
    process.exit(1);
  }

  process.exit(0);
}
