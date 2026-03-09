import type { RuntimeAdapter } from "./types.ts";
import { MlxAdapter } from "./mlx.ts";
import { LlamaCppAdapter } from "./llamacpp.ts";
import { VllmAdapter } from "./vllm.ts";

const RUNTIMES: Record<string, () => RuntimeAdapter> = {
  mlx: () => new MlxAdapter(),
  "llama.cpp": () => new LlamaCppAdapter(),
  vllm: () => new VllmAdapter(),
};

export function resolveRuntime(name: string): RuntimeAdapter {
  const factory = RUNTIMES[name];
  if (!factory) {
    const valid = Object.keys(RUNTIMES).join(", ");
    throw new Error(`Unknown runtime '${name}'. Supported: ${valid}`);
  }
  return factory();
}

export function listRuntimes(): string[] {
  return Object.keys(RUNTIMES);
}
