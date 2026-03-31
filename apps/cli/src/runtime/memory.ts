/**
 * Shared process memory monitoring for runtime adapters.
 *
 * Two strategies are available:
 *
 * 1. `monitorProcessMemory(pid)` — polls a subprocess's `phys_footprint` via
 *    the macOS `footprint` command (falls back to `ps -o rss=`). Suitable for
 *    runtimes where memory is attributed to the process (e.g. mlx_lm).
 *
 * 2. `monitorSystemMemory()` — measures system-wide memory delta before/during
 *    a benchmark on macOS. Required for llama.cpp because Metal GPU buffer
 *    allocations are not always attributed to the process's
 *    `phys_footprint` — they consume real unified memory but are owned by the
 *    GPU driver. The system-level delta captures all memory consumption
 *    regardless of attribution.
 */

const POLL_INTERVAL_MS = 500;

interface MemorySample {
  currentKb: number;
  peakKb: number;
}

// ---------------------------------------------------------------------------
// Strategy 1: per-process monitoring (for mlx_lm)
// ---------------------------------------------------------------------------

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
  stop: () => Promise<{ peakMb: number; idleMb: number }>;
} {
  const samples: MemorySample[] = [];
  let running = true;
  let inferenceStartIdx: number | null = null;
  const useFootprint = { value: process.platform === 'darwin' };

  const poll = async () => {
    while (running) {
      const sample = await sampleProcessMemory(pid, useFootprint);
      if (sample.currentKb > 0) {
        samples.push(sample);
      }
      if (!running) break;
      await Bun.sleep(POLL_INTERVAL_MS);
    }
  };
  const pollTask = poll();

  return {
    markInferenceStart() {
      if (inferenceStartIdx === null) {
        inferenceStartIdx = samples.length;
      }
    },

    async stop() {
      running = false;
      await pollTask;
      if (samples.length === 0) return { peakMb: 0, idleMb: 0 };

      const peakKb = samples.reduce(
        (max, sample) => (sample.peakKb > max ? sample.peakKb : max),
        0
      );

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
// Strategy 2: system-wide memory delta (for llama.cpp + Metal)
// ---------------------------------------------------------------------------

/**
 * Monitor memory by tracking system-wide memory consumption delta on macOS.
 *
 * Takes a baseline of system "used memory" before the subprocess starts, then
 * call `start()` immediately after spawning the subprocess to begin polling.
 * This captures ALL memory consumption including Metal GPU buffer allocations
 * that `phys_footprint` misses.
 *
 * "Used memory" = (active + wired + speculative + compressor) pages from
 * `vm_stat`. The delta from baseline isolates the benchmark's contribution.
 *
 * Trade-off: slightly noisier than per-process measurement (other processes
 * can affect system memory), but a multi-GB model load dominates any noise.
 */
export async function monitorSystemMemory(): Promise<{
  start: () => Promise<void>;
  markInferenceStart: () => void;
  stop: () => Promise<{ peakMb: number; idleMb: number }>;
} | null> {
  const baselineKb = await getSystemUsedMemoryKb();
  if (baselineKb <= 0) return null;

  const deltas: number[] = [];
  let running = false;
  let inferenceStartIdx: number | null = null;
  let pollTask: Promise<void> | null = null;

  const sampleDelta = async () => {
    const currentKb = await getSystemUsedMemoryKb();
    if (currentKb <= 0) return;
    const delta = currentKb - baselineKb;
    deltas.push(Math.max(0, delta));
  };

  const poll = async () => {
    while (running) {
      await Bun.sleep(POLL_INTERVAL_MS);
      if (!running) break;
      await sampleDelta();
    }
  };

  return {
    async start() {
      if (running) return;
      running = true;
      await sampleDelta();
      pollTask = poll();
    },

    markInferenceStart() {
      if (inferenceStartIdx === null) {
        inferenceStartIdx = deltas.length;
      }
    },

    async stop() {
      running = false;
      await pollTask;
      if (deltas.length === 0) return { peakMb: 0, idleMb: 0 };

      const peakKb = deltas.reduce((a, b) => (a > b ? a : b), 0);

      let idleSamples: number[];
      if (inferenceStartIdx !== null && inferenceStartIdx > 0) {
        idleSamples = deltas.slice(0, inferenceStartIdx);
      } else {
        idleSamples = deltas.slice(0, Math.max(1, Math.floor(deltas.length / 2)));
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

/**
 * Get system-wide "used memory" in KB by parsing `vm_stat` output.
 *
 * Used = (active + wired + speculative + compressor) * pageSize.
 * This accounts for all physical memory actively consumed, including Metal
 * GPU buffers which appear as wired/active pages at the system level.
 */
async function getSystemUsedMemoryKb(): Promise<number> {
  try {
    const proc = Bun.spawn(['vm_stat'], { stdout: 'pipe', stderr: 'ignore' });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    // vm_stat header: "Mach Virtual Memory Statistics: (page size of 16384 bytes)"
    const pageSizeMatch = text.match(/page size of (\d+) bytes/);
    const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]!, 10) : 16384;

    const active = parseVmStatField(text, 'Pages active');
    const wired = parseVmStatField(text, 'Pages wired down');
    const speculative = parseVmStatField(text, 'Pages speculative');
    const compressor = parseVmStatField(text, 'Pages occupied by compressor');

    const usedPages = active + wired + speculative + compressor;
    return (usedPages * pageSize) / 1024;
  } catch {
    return 0;
  }
}

function parseVmStatField(text: string, field: string): number {
  const match = text.match(new RegExp(`${field}:\\s*(\\d+)`));
  return match ? parseInt(match[1]!, 10) : 0;
}

// ---------------------------------------------------------------------------
// Platform-specific per-process memory sampling
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
async function sampleProcessMemory(
  pid: number,
  useFootprint: { value: boolean }
): Promise<MemorySample> {
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
      // The command can fail with a nonzero exit on some hosts even when the
      // binary exists. Stop retrying in that case and fall back to RSS.
      useFootprint.value = false;
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
