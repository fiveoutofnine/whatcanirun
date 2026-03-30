/**
 * Shared process memory monitoring for runtime adapters.
 *
 * Polls a subprocess's physical memory footprint at regular intervals to
 * capture peak and idle memory usage. This is used by both the llama.cpp and
 * mlx_lm adapters to provide consistent, comparable memory metrics across
 * runtimes.
 *
 * On macOS, uses `footprint` which reports both `phys_footprint` (current) and
 * `phys_footprint_peak` (OS-tracked all-time peak) — the true physical memory
 * footprint including unified (CPU+GPU) memory on Apple Silicon. Using the
 * OS-tracked peak avoids missing transient spikes between poll intervals.
 * Falls back to `ps -o rss=` on other platforms or if `footprint` fails.
 *
 * Note: llama-bench does not report memory in its JSON output, and mlx_lm's
 * `peak_memory` field is framework-level allocation (from `mx.get_peak_memory()`)
 * which is not equivalent to process RSS. External polling ensures both
 * runtimes use the same measurement methodology.
 */

const POLL_INTERVAL_MS = 500;

interface MemorySample {
  currentKb: number;
  peakKb: number;
}

/**
 * Start polling a subprocess's memory usage.
 *
 * Call `markInferenceStart()` when the process signals that inference is about
 * to begin (e.g. first progress line). This splits samples into idle (pre-
 * inference) and active phases.
 *
 * Call `stop()` when the process exits to get peak and idle measurements.
 *
 * "Peak" is from `phys_footprint_peak` (OS-tracked, no polling gaps) on macOS,
 * or the maximum polled RSS on other platforms.
 * "Idle" is the median of current-memory samples collected before
 * `markInferenceStart()`. Falls back to median of first half if no signal.
 */
export function monitorProcessMemory(pid: number): {
  markInferenceStart: () => void;
  stop: () => { peakMb: number; idleMb: number };
} {
  const samples: MemorySample[] = [];
  let running = true;
  let inferenceStartIdx: number | null = null;
  const useFootprint = { value: process.platform === 'darwin' };

  const poll = async () => {
    while (running) {
      const sample = await sampleMemory(pid, useFootprint);
      if (sample.currentKb > 0) {
        samples.push(sample);
      }
      await Bun.sleep(POLL_INTERVAL_MS);
    }
  };
  poll();

  return {
    markInferenceStart() {
      if (inferenceStartIdx === null) {
        inferenceStartIdx = samples.length;
      }
    },

    stop() {
      running = false;
      if (samples.length === 0) return { peakMb: 0, idleMb: 0 };

      // Use the OS-tracked peak from the last sample (it's monotonically
      // non-decreasing, so the last value is the true lifetime peak).
      const peakKb = samples[samples.length - 1]!.peakKb;

      // Idle = RSS after model loading, before inference starts.
      // Use current-memory samples collected before markInferenceStart().
      // Fall back to median of first half if no signal was received.
      let idleSamples: number[];
      if (inferenceStartIdx !== null && inferenceStartIdx > 0) {
        idleSamples = samples.slice(0, inferenceStartIdx).map((s) => s.currentKb);
      } else {
        idleSamples = samples
          .slice(0, Math.max(1, Math.floor(samples.length / 2)))
          .map((s) => s.currentKb);
      }
      idleSamples.sort((a, b) => a - b);
      const idleKb = idleSamples[Math.floor(idleSamples.length / 2)]!;

      return {
        peakMb: Math.round((peakKb / 1024) * 10) / 10,
        idleMb: Math.round((idleKb / 1024) * 10) / 10,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Platform-specific memory sampling
// ---------------------------------------------------------------------------

/**
 * Sample the physical memory of a process in KB, returning both the current
 * footprint and the OS-tracked peak.
 *
 * On macOS, tries `footprint <pid>` first which reports both:
 *   - `phys_footprint:` — current physical memory (for idle calculation)
 *   - `phys_footprint_peak:` — all-time peak tracked by the OS (no polling gaps)
 *
 * Falls back to `ps -o rss=` where peak equals current (best effort).
 *
 * The `useFootprint` flag tracks whether `footprint` is available for this
 * monitor session. It starts as true on macOS and is set to false on the first
 * failure, avoiding repeated spawn attempts for a missing binary while still
 * retrying across separate monitorProcessMemory() calls.
 */
async function sampleMemory(pid: number, useFootprint: { value: boolean }): Promise<MemorySample> {
  // Try macOS `footprint` command (accurate unified memory measurement).
  if (process.platform === 'darwin' && useFootprint.value) {
    try {
      const proc = Bun.spawn(['footprint', String(pid)], {
        stdout: 'pipe',
        stderr: 'ignore',
      });
      const text = await new Response(proc.stdout).text();
      const code = await proc.exited;
      if (code === 0) {
        const currentKb = parseFootprintValue(
          text,
          /phys_footprint(?!_peak):\s*([\d.]+)\s*(KB|MB|GB)/i
        );
        const peakKb = parseFootprintValue(text, /phys_footprint_peak:\s*([\d.]+)\s*(KB|MB|GB)/i);
        if (currentKb > 0) {
          return { currentKb, peakKb: peakKb > 0 ? peakKb : currentKb };
        }
      }
    } catch {
      // footprint not available — stop trying for this monitor session.
      useFootprint.value = false;
    }
  }

  // Fallback: ps -o rss= (available on macOS and Linux).
  // No separate peak tracking — peak equals current (best effort).
  try {
    const proc = Bun.spawn(['ps', '-o', 'rss=', '-p', String(pid)], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const text = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    const kb = parseInt(text, 10);
    const val = isNaN(kb) ? 0 : kb;
    return { currentKb: val, peakKb: val };
  } catch {
    // Process may have exited.
    return { currentKb: 0, peakKb: 0 };
  }
}

function parseFootprintValue(text: string, regex: RegExp): number {
  const match = text.match(regex);
  if (!match) return 0;
  const value = parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();
  if (unit === 'KB') return value;
  if (unit === 'MB') return value * 1024;
  if (unit === 'GB') return value * 1024 * 1024;
  return 0;
}
