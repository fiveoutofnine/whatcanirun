import { LlamaCppAdapter } from './llamacpp.ts';
import { MlxAdapter } from './mlx.ts';
import type { RuntimeAdapter } from './types.ts';

const RUNTIMES: Record<string, () => RuntimeAdapter> = {
  mlx_lm: () => new MlxAdapter(),
  'llama.cpp': () => new LlamaCppAdapter(),
};

export function resolveRuntime(name: string): RuntimeAdapter {
  const factory = RUNTIMES[name];
  if (!factory) {
    const valid = Object.keys(RUNTIMES).join(', ');
    throw new Error(`Unknown runtime '${name}'. Supported: ${valid}`);
  }
  return factory();
}

export function listRuntimes(): string[] {
  return Object.keys(RUNTIMES);
}
