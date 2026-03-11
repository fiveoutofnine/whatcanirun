import type { GenerateOpts, RuntimeAdapter } from '../runtime/types';
import { MemoryTracker } from './memory';

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

export interface TrialProgress {
  output_tokens: number;
  ttft_ms: number | null;
  decode_tps: number;
  elapsed_ms: number;
}

export async function runTrial(
  adapter: RuntimeAdapter,
  opts: GenerateOpts,
  inputTokens: number,
  memTracker: MemoryTracker,
  onProgress?: (progress: TrialProgress) => void,
  onStatus?: (message: string) => void
): Promise<TrialResult> {
  const tStart = performance.now();
  let tFirstToken: number | null = null;
  let tLastToken = tStart;
  let outputTokens = 0;
  let exitStatus = 0;
  let trackingStarted = false;
  let promptEvalMs: number | null = null;

  try {
    const gen = adapter.generate(opts);

    for await (const event of gen) {
      if (!trackingStarted) {
        const pid = adapter.getProcessId();
        if (pid) {
          memTracker.startTracking(pid);
        }
        trackingStarted = true;
      }

      switch (event.type) {
        case 'token':
          if (tFirstToken === null) {
            tFirstToken = performance.now();
          }
          tLastToken = performance.now();
          outputTokens++;
          if (onProgress) {
            const now = performance.now();
            const decodeMs = tFirstToken ? now - tFirstToken : 0;
            const decodeTokens = Math.max(outputTokens - 1, 0);
            onProgress({
              output_tokens: outputTokens,
              ttft_ms: tFirstToken ? Math.round((tFirstToken - tStart) * 100) / 100 : null,
              decode_tps:
                decodeMs > 0 ? Math.round((decodeTokens / (decodeMs / 1000)) * 10) / 10 : 0,
              elapsed_ms: Math.round(now - tStart),
            });
          }
          break;
        case 'done':
          if (event.output_tokens > 0) {
            outputTokens = event.output_tokens;
          }
          break;
        case 'status': {
          // Check for runtime-reported prompt eval time
          const peMatch = event.message.match(/^__prompt_eval_ms:([\d.]+)$/);
          if (peMatch) {
            promptEvalMs = parseFloat(peMatch[1]!);
          } else if (onStatus) {
            onStatus(event.message);
          }
          break;
        }
        case 'error':
          throw new Error(event.message);
          break;
      }
    }
  } catch (e) {
    if (e instanceof Error) throw e;
    exitStatus = 1;
  } finally {
    memTracker.stopTracking();
  }

  // If no first token was detected, use end time
  if (tFirstToken === null) {
    tFirstToken = tLastToken;
  }

  // Use runtime-reported prompt eval time if available (excludes model loading),
  // otherwise fall back to wall-clock TTFT (includes model loading overhead).
  const ttftMs = promptEvalMs ?? tFirstToken - tStart;
  const totalMs = tLastToken - tStart;
  const decodeMs = tLastToken - tFirstToken;
  // First token is from prefill, not decode — subtract 1 from output tokens
  const decodeTokens = Math.max(outputTokens - 1, 0);
  const decodeTps = decodeMs > 0 ? decodeTokens / (decodeMs / 1000) : 0;
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
