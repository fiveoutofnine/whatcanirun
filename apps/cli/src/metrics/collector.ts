import type { GenerateOpts, RuntimeAdapter } from '../runtime/types.ts';
import { MemoryTracker } from './memory.ts';

export interface TrialResult {
  input_tokens: number;
  output_tokens: number;
  ttft_ms: number;
  total_ms: number;
  decode_ms: number;
  decode_tps: number;
  weighted_tps: number;
  idle_rss_mb: number;
  peak_rss_mb: number;
  exit_status: number;
}

export async function runTrial(
  adapter: RuntimeAdapter,
  opts: GenerateOpts,
  inputTokens: number,
  memTracker: MemoryTracker
): Promise<TrialResult> {
  const tStart = performance.now();
  let tFirstToken: number | null = null;
  let tLastToken = tStart;
  let outputTokens = 0;
  let exitStatus = 0;

  const pid = adapter.getProcessId();
  if (pid) {
    memTracker.startTracking(pid);
  }

  try {
    const gen = adapter.generate(opts);

    for await (const event of gen) {
      switch (event.type) {
        case 'token':
          if (tFirstToken === null) {
            tFirstToken = performance.now();
          }
          tLastToken = performance.now();
          outputTokens++;
          break;
        case 'done':
          tLastToken = performance.now();
          if (event.output_tokens > 0) {
            outputTokens = event.output_tokens;
          }
          break;
        case 'error':
          exitStatus = 1;
          break;
      }
    }
  } catch {
    exitStatus = 1;
  } finally {
    memTracker.stopTracking();
  }

  // If no first token was detected, use end time
  if (tFirstToken === null) {
    tFirstToken = tLastToken;
  }

  const ttftMs = tFirstToken - tStart;
  const totalMs = tLastToken - tStart;
  const decodeMs = tLastToken - tFirstToken;
  const decodeTps = decodeMs > 0 ? outputTokens / (decodeMs / 1000) : 0;
  const weightedTps = totalMs > 0 ? (inputTokens + outputTokens) / (totalMs / 1000) : 0;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ttft_ms: Math.round(ttftMs * 100) / 100,
    total_ms: Math.round(totalMs * 100) / 100,
    decode_ms: Math.round(decodeMs * 100) / 100,
    decode_tps: Math.round(decodeTps * 10) / 10,
    weighted_tps: Math.round(weightedTps * 10) / 10,
    idle_rss_mb: memTracker.getIdleMb(),
    peak_rss_mb: memTracker.getPeakMb(),
    exit_status: exitStatus,
  };
}
