/**
 * Shared process memory monitoring for runtime adapters.
 *
 * Polls a subprocess's physical memory footprint at regular intervals to
 * capture peak and idle memory usage. This is used by both the llama.cpp and
 * mlx_lm adapters to provide consistent, comparable memory metrics across
 * runtimes.
 *
 * On macOS, uses `footprint` which reports `phys_footprint_peak` — the true
 * physical memory footprint including unified (CPU+GPU) memory on Apple
 * Silicon. Falls back to `ps -o rss=` on other platforms or if `footprint`
 * fails.
 *
 * Note: llama-bench does not report memory in its JSON output, and mlx_lm's
 * `peak_memory` field is framework-level allocation (from `mx.get_peak_memory()`)
 * which is not equivalent to process RSS. External polling ensures both
 * runtimes use the same measurement methodology.
 */

const POLL_INTERVAL_MS = 500;

/**
 * Start polling a subprocess's memory usage.
 * Call `stop()` when the process exits to get peak and idle measurements.
 *
 * "Peak" is the maximum memory observed across all samples.
 * "Idle" is approximated as the median of the first half of samples —
 * capturing the stable RSS after model loading, before inference peak.
 */
export function monitorProcessMemory(pid: number): {
  stop: () => { peakMb: number; idleMb: number };
} {
  const samples: number[] = [];
  let running = true;
  const useFootprint = { value: process.platform === 'darwin' };

  const poll = async () => {
    while (running) {
      const kb = await sampleMemoryKb(pid, useFootprint);
      if (kb > 0) {
        samples.push(kb);
      }
      await Bun.sleep(POLL_INTERVAL_MS);
    }
  };
  poll();

  return {
    stop() {
      running = false;
      if (samples.length === 0) return { peakMb: 0, idleMb: 0 };

      const peakKb = samples.reduce((a, b) => (a > b ? a : b), 0);

      // Idle ≈ the stable RSS after model loading, before inference peak.
      // Use the median of the first half of samples as a rough approximation.
      const firstHalf = samples.slice(0, Math.max(1, Math.floor(samples.length / 2)));
      firstHalf.sort((a, b) => a - b);
      const idleKb = firstHalf[Math.floor(firstHalf.length / 2)]!;

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
 * Sample the physical memory of a process in KB.
 *
 * On macOS, tries `footprint <pid>` first which reports `phys_footprint`
 * (accurate for unified memory on Apple Silicon). Falls back to `ps -o rss=`.
 *
 * The `useFootprint` flag tracks whether `footprint` is available for this
 * monitor session. It starts as true on macOS and is set to false on the first
 * failure, avoiding repeated spawn attempts for a missing binary while still
 * retrying across separate monitorProcessMemory() calls.
 */
async function sampleMemoryKb(pid: number, useFootprint: { value: boolean }): Promise<number> {
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
        // Parse "phys_footprint: 785 KB" or "phys_footprint: 1.2 GB" etc.
        const match = text.match(/phys_footprint:\s*([\d.]+)\s*(KB|MB|GB)/i);
        if (match) {
          const value = parseFloat(match[1]!);
          const unit = match[2]!.toUpperCase();
          if (unit === 'KB') return value;
          if (unit === 'MB') return value * 1024;
          if (unit === 'GB') return value * 1024 * 1024;
        }
      }
    } catch {
      // footprint not available — stop trying for this monitor session.
      useFootprint.value = false;
    }
  }

  // Fallback: ps -o rss= (available on macOS and Linux).
  try {
    const proc = Bun.spawn(['ps', '-o', 'rss=', '-p', String(pid)], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const text = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    const kb = parseInt(text, 10);
    return isNaN(kb) ? 0 : kb;
  } catch {
    // Process may have exited.
    return 0;
  }
}
