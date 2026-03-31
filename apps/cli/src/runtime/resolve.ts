import chalk from 'chalk';

import { LlamaCppAdapter } from './llamacpp.ts';
import { MlxAdapter } from './mlx.ts';
import { OllamaAdapter } from './ollama.ts';
import type { RuntimeAdapter } from './types.ts';

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------

const RUNTIMES: Record<string, () => RuntimeAdapter> = {
  mlx_lm: () => new MlxAdapter(),
  'llama.cpp': () => new LlamaCppAdapter(),
  ollama: () => new OllamaAdapter(),
};

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function resolveRuntime(name: string): RuntimeAdapter {
  const factory = RUNTIMES[name];
  if (!factory) {
    const valid = Object.keys(RUNTIMES).join(', ');
    throw new Error(`Unknown runtime "${chalk.cyan(name)}". Supported: ${chalk.cyan(valid)}.`);
  }
  return factory();
}

export function listRuntimes(): string[] {
  return Object.keys(RUNTIMES);
}
