import type { FeaturedDeviceInfo, FeaturedRuntime } from '@whatcanirun/shared';
import chalk from 'chalk';
import { clearScreenDown, cursorTo, moveCursor } from 'node:readline';

import { getAuth } from './auth/token';
import { executeBenchmark } from './commands/run';
import { detectDevice } from './device/detect';
import { fetchFeaturedModels } from './featured/client';
import { canManageLlamaCppRuntime, ensureManagedLlamaCppInstalled } from './runtime/install';
import { resolveRuntime } from './runtime/resolve';
import type { RuntimeInfo } from './runtime/types';
import { binName } from './utils/bin';
import * as log from './utils/log';
import { Spinner } from './utils/log';

// -----------------------------------------------------------------------------
// Arrow-key picker (vertical list)
// -----------------------------------------------------------------------------

const MODEL_PICKER_VISIBLE_COUNT = 5;

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

interface SearchablePickItem {
  label: string;
  searchText?: string;
}

function filterPickItems(items: SearchablePickItem[], query: string): number[] {
  const normalizedQuery = query.trim().toLowerCase();

  return items.flatMap((item, index) => {
    const searchableText = `${item.label} ${item.searchText ?? ''}`.toLowerCase();
    return normalizedQuery === '' || searchableText.includes(normalizedQuery) ? [index] : [];
  });
}

function pickSearchable(
  items: SearchablePickItem[],
  {
    defaultIndex = 0,
    visibleCount = MODEL_PICKER_VISIBLE_COUNT,
    emptySearchLabel = 'start typing to filter models…',
  }: {
    defaultIndex?: number;
    emptySearchLabel?: string;
    visibleCount?: number;
  } = {}
): Promise<number> {
  if (!process.stdin.isTTY) {
    return Promise.resolve(defaultIndex);
  }

  return new Promise((resolve) => {
    const { stdin, stdout } = process;

    let query = '';
    let filteredIndices = filterPickItems(items, query);
    let cursor =
      filteredIndices.length > 0 ? Math.min(defaultIndex, filteredIndices.length - 1) : 0;
    let scrollOffset = 0;
    let renderedLineCount = 0;

    function syncViewport() {
      if (filteredIndices.length === 0) {
        cursor = 0;
        scrollOffset = 0;
        return;
      }

      cursor = Math.max(0, Math.min(cursor, filteredIndices.length - 1));

      if (filteredIndices.length <= visibleCount) {
        scrollOffset = 0;
        return;
      }

      if (cursor < scrollOffset) {
        scrollOffset = cursor;
      } else if (cursor >= scrollOffset + visibleCount) {
        scrollOffset = cursor - visibleCount + 1;
      }
    }

    function rerender() {
      if (renderedLineCount > 0) {
        moveCursor(stdout, 0, -renderedLineCount);
        cursorTo(stdout, 0);
        clearScreenDown(stdout);
      }

      const lines: string[] = [];
      const shouldScroll = filteredIndices.length > visibleCount;
      const visibleItems = shouldScroll
        ? filteredIndices.slice(scrollOffset, scrollOffset + visibleCount)
        : filteredIndices;

      lines.push(
        `${chalk.dim('Search:')} ${query.length > 0 ? chalk.white(query) : chalk.dim(emptySearchLabel)}`
      );

      if (filteredIndices.length === 0) {
        lines.push(chalk.dim('No matching models. Edit the search to continue.'));
      } else if (shouldScroll) {
        const start = scrollOffset + 1;
        const end = scrollOffset + visibleItems.length;
        lines.push(
          chalk.dim('Showing ') +
            chalk.white(start) +
            chalk.dim('–') +
            chalk.white(end) +
            chalk.dim(' of ') +
            chalk.white(filteredIndices.length) +
            chalk.dim(' models.')
        );
      } else {
        lines.push(
          chalk.dim(
            `${filteredIndices.length} model${filteredIndices.length === 1 ? '' : 's'} available`
          )
        );
      }

      for (let i = 0; i < visibleItems.length; i++) {
        const item = items[visibleItems[i]!]!;
        const isSelected = scrollOffset + i === cursor;
        if (isSelected) {
          lines.push(`\x1b[2K${chalk.cyan('❯')} ${chalk.cyan(item.label)}`);
        } else {
          lines.push(`\x1b[2K  ${chalk.dim(item.label)}`);
        }
      }

      stdout.write(lines.join('\n') + '\n');
      renderedLineCount = lines.length;
    }

    function resetFilteredItems() {
      filteredIndices = filterPickItems(items, query);
      cursor = 0;
      scrollOffset = 0;
      syncViewport();
      rerender();
    }

    function onData(data: Buffer) {
      const key = data.toString();

      if (key === '\x1b[A') {
        if (filteredIndices.length === 0) return;
        cursor = (cursor - 1 + filteredIndices.length) % filteredIndices.length;
        syncViewport();
        rerender();
        return;
      }
      if (key === '\x1b[B') {
        if (filteredIndices.length === 0) return;
        cursor = (cursor + 1) % filteredIndices.length;
        syncViewport();
        rerender();
        return;
      }
      if (key === '\r' || key === '\n') {
        if (filteredIndices.length === 0) return;
        cleanup();
        resolve(filteredIndices[cursor]!);
        return;
      }
      if (key === '\x7f' || key === '\b') {
        if (query.length === 0) return;
        query = query.slice(0, -1);
        resetFilteredItems();
        return;
      }
      if (key === '\x15') {
        if (query.length === 0) return;
        query = '';
        resetFilteredItems();
        return;
      }
      if (key === '\x03' || key === '\x1b') {
        cleanup();
        resolve(-1);
        return;
      }
      if (key.length === 1 && key >= ' ' && key !== '\x7f') {
        query += key;
        resetFilteredItems();
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

    syncViewport();
    rerender();
  });
}

// -----------------------------------------------------------------------------
// Runtime detection
// -----------------------------------------------------------------------------

interface DetectedRuntime {
  name: FeaturedRuntime;
  info: RuntimeInfo;
}

const RUNTIME_NAMES = ['mlx_lm', 'llama.cpp'] as const;

const INSTALL_HINTS: Record<string, string> = {
  mlx_lm: `${chalk.bold.cyan('brew install mlx-lm')} or ${chalk.bold.cyan('pip install mlx-lm')}`,
  'llama.cpp': canManageLlamaCppRuntime()
    ? `${chalk.bold.cyan(`${binName()} --model-sources "<repo:file.gguf>"`)} to auto-install the managed CUDA runtime`
    : `${chalk.bold.cyan('brew install llama.cpp')}`,
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
    if (runtimes.length === 0 && canManageLlamaCppRuntime()) {
      detectSpinner.update(chalk.dim('Installing llama.cpp runtime…'));
      await ensureManagedLlamaCppInstalled();
      runtimes = await detectRuntimes();
    }
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
  const fetchSpinner = new Spinner(chalk.dim('Detecting device…')).start();
  activeSpinner = fetchSpinner;
  let featuredDevice: FeaturedDeviceInfo | undefined;
  try {
    const device = await detectDevice();
    featuredDevice = {
      cpu: device.cpu_model,
      gpu: device.gpu_model,
      gpuCount: device.gpu_count,
      ramGb: device.ram_gb,
      osName: device.os_name,
    };
  } catch {
    featuredDevice = undefined;
  }
  fetchSpinner.update(chalk.dim('Fetching models…'));
  const featured = await fetchFeaturedModels({
    device: featuredDevice,
    runtime: selectedRuntime.name,
  });
  activeSpinner = null;
  fetchSpinner.stop(chalk.white(`[${chalk.green('✓')}] Loaded models.`));
  if (featured.source === 'fallback') {
    console.log(chalk.dim(' ↳ Using the bundled wishlist because the models API was unavailable.'));
  }
  const models = featured.models;

  if (models.length === 0) {
    if (runtimes.length > 1) console.log();
    log.error(`No models for ${chalk.cyan(selectedRuntime.name)}.`);
    console.log(
      chalk.dim(
        `↳ Run a benchmark manually with ${chalk.bold.cyan(`${binName()} run --model <model> --runtime ${selectedRuntime.name}`)}`
      )
    );
    process.exit(1);
  }

  console.log(
    chalk.white('Select a model to benchmark') +
      chalk.dim('  (type to search · ↑/↓ to move · enter to select · esc to quit)')
  );

  const choice = await pickSearchable(
    models.map((model) => ({
      label: model.displayName,
      searchText: [model.hfRepoId, model.hfFileName].filter(Boolean).join(' '),
    })),
    {
      visibleCount: models.length < 6 ? models.length : MODEL_PICKER_VISIBLE_COUNT,
    }
  );
  if (choice < 0) process.exit(0);

  const selected = models[choice]!;

  // Ask to submit before running.
  const auth = getAuth();
  const submitHint = auth
    ? `  (as ${chalk.cyan(auth.user.name)} (${chalk.cyan(auth.user.email)}), publicly visible)`
    : '  (anonymous)';
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
