import { warn } from '../utils/log.ts';
import { monitorProcessMemory } from './memory.ts';
import type { BenchOpts, BenchResult, BenchTrial, RuntimeAdapter, RuntimeInfo } from './types.ts';
import { LLAMA_CPP_MIN_BUILD, parseLlamaCppBuild, UnsupportedVersionError } from './version.ts';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Shape of a single entry in `llama-bench -o json` output.
 *
 * llama-bench returns a JSON array with one object per test configuration.
 * We run two tests: prompt-only (n_prompt>0, n_gen=0) and generation-only
 * (n_gen>0, n_prompt=0).
 *
 * Required fields for our parser:
 *   n_prompt, n_gen     — identify which test this entry belongs to
 *   avg_ts, stddev_ts   — aggregate throughput in tokens/sec
 *   samples_ts          — per-repetition throughput values (one per -r rep)
 *
 * Many additional fields are present (build_commit, build_number, cpu_info,
 * gpu_info, backends, model_*, n_batch, n_ubatch, n_threads, type_k, type_v,
 * n_gpu_layers, flash_attn, etc.) but are not used by our parser. The
 * [key: string]: unknown catch-all provides forward compatibility.
 *
 * Memory is NOT reported by llama-bench — we poll RSS externally via
 * monitorProcessMemory().
 *
 * Minimum stable version: b${LLAMA_CPP_MIN_BUILD} (for -o json with samples_ts).
 */
interface LlamaBenchEntry {
  build_commit: string;
  build_number: number;
  model_filename: string;
  model_type: string;
  model_size: number;
  model_n_params: number;
  n_prompt: number;
  n_gen: number;
  avg_ts: number;
  stddev_ts: number;
  samples_ts: number[];
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// Adapter
// -----------------------------------------------------------------------------

export class LlamaCppAdapter implements RuntimeAdapter {
  name = 'llama.cpp';

  async detect(): Promise<RuntimeInfo | null> {
    // llama-cli --version gives clean output like "version: 8240 (d088d5b74)"
    for (const bin of ['llama-cli', 'llama-completion', 'llama-cpp', 'main']) {
      try {
        const proc = Bun.spawn([bin, '--version'], {
          stdout: 'pipe',
          stderr: 'pipe',
        });
        const stdout = (await new Response(proc.stdout).text()).trim();
        const stderr = (await new Response(proc.stderr).text()).trim();
        const code = await proc.exited;
        if (code !== 0) continue;

        const output = stdout || stderr;
        const versionMatch = output.match(/version:\s*(\d+)\s*\((\w+)\)/);
        if (versionMatch) {
          const buildNum = parseLlamaCppBuild(versionMatch[1]!);
          if (buildNum !== null && buildNum < LLAMA_CPP_MIN_BUILD) {
            throw new UnsupportedVersionError(
              'llama.cpp',
              `b${buildNum}`,
              `b${LLAMA_CPP_MIN_BUILD}`
            );
          }
          return {
            name: this.name,
            version: `b${versionMatch[1]}`,
            build_flags: 'metal',
          };
        }

        // Fallback: non-standard version format. Warn but allow — may be a
        // custom build where we can't verify the build number.
        const fallbackMatch = output.match(/version:\s*(\S+)|llama\.cpp\s+(\S+)|build:\s*(\d+)/i);
        const version =
          fallbackMatch?.[1] || fallbackMatch?.[2] || fallbackMatch?.[3] || output.slice(0, 50);
        warn(
          `Could not parse llama.cpp build number from "${version}". Version check skipped — output format may not be compatible.`
        );
        return { name: this.name, version };
      } catch (e: unknown) {
        if (e instanceof UnsupportedVersionError) throw e;
        if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }
        warn(`Failed to run ${bin}: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }
    return null;
  }

  async benchmark(opts: BenchOpts): Promise<BenchResult> {
    const args = [
      '-m',
      opts.model,
      '-p',
      String(opts.promptTokens),
      '-n',
      String(opts.genTokens),
      '-r',
      String(opts.numTrials),
      '-o',
      'json',
      '--progress',
      // Note: mmap is disabled by default in llama-bench (-mmp defaults to 0),
      // so RSS already reflects actual memory usage without any extra flags.
    ];

    const proc = Bun.spawn(['llama-bench', ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Poll process memory to measure peak and idle usage (llama-bench doesn't report it).
    const memMonitor = monitorProcessMemory(proc.pid);

    // Stream both stdout and stderr concurrently to avoid pipe buffer deadlock.
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const streamStdout = (async () => {
      const decoder = new TextDecoder();
      for await (const chunk of proc.stdout) {
        stdoutChunks.push(decoder.decode(chunk, { stream: true }));
      }
    })();

    const streamStderr = (async () => {
      let buffer = '';
      let inferenceMarked = false;
      const decoder = new TextDecoder();
      for await (const chunk of proc.stderr) {
        const text = decoder.decode(chunk, { stream: true });
        stderrChunks.push(text);
        buffer += text;

        const lines = buffer.split('\n');
        buffer = lines.pop()!;
        for (const line of lines) {
          // --progress lines: "llama-bench: benchmark 1/2: prompt run 2/3"
          // Emit on both pp and tg for smooth progress, mapped to user-facing trial count.
          const runMatch = line.match(
            /benchmark (\d+)\/(\d+):\s+(?:prompt|generation) run (\d+)\/(\d+)/
          );
          if (runMatch) {
            if (!inferenceMarked) {
              memMonitor.markInferenceStart();
              inferenceMarked = true;
            }
            const bench = parseInt(runMatch[1]!, 10);
            const numBenches = parseInt(runMatch[2]!, 10);
            const runIdx = parseInt(runMatch[3]!, 10);
            const runsPerBench = parseInt(runMatch[4]!, 10);
            const completed = (bench - 1) * runsPerBench + runIdx;
            const total = numBenches * runsPerBench;
            // Map internal runs (1..20) to user-facing trials (1..10)
            const trial = Math.ceil((completed / total) * runsPerBench);
            opts.onProgress?.(`Trial ${trial}/${runsPerBench}`);
          }
        }
      }
      if (buffer) stderrChunks.push(buffer);
    })();

    await Promise.all([streamStdout, streamStderr]);
    const stdout = stdoutChunks.join('');
    const stderr = stderrChunks.join('');
    const code = await proc.exited;

    const mem = memMonitor.stop();

    if (code !== 0) {
      const errMsg = stderr.trim() || stdout.trim() || `exit code ${code}`;
      throw new Error(`llama-bench failed: ${errMsg}`);
    }

    return this.parseOutput(stdout, opts.promptTokens, opts.genTokens, mem);
  }

  /**
   * Parse llama-bench `-o json` output.
   *
   * Expected input: a JSON array with two entries:
   *   - Prompt test:     { n_prompt: >0, n_gen: 0, avg_ts, samples_ts: [...] }
   *   - Generation test: { n_prompt: 0, n_gen: >0, avg_ts, samples_ts: [...] }
   *
   * Per-trial throughput comes from `samples_ts` (one value per `-r` repetition).
   * Aggregate throughput comes from `avg_ts`.
   *
   * Memory is provided by the external RSS monitor, not by llama-bench.
   *
   * If parsing fails, error messages reference the minimum supported version
   * to help users diagnose version-related format mismatches.
   */
  private parseOutput(
    stdout: string,
    promptTokens: number,
    genTokens: number,
    mem: { peakMb: number; idleMb: number }
  ): BenchResult {
    let entries: LlamaBenchEntry[];
    try {
      entries = JSON.parse(stdout);
    } catch {
      throw new Error(
        `Could not parse llama-bench JSON output. This may indicate a version that does not ` +
          `support '-o json'. Minimum required: b${LLAMA_CPP_MIN_BUILD}.\n\n` +
          `Raw output (truncated):\n${stdout.slice(0, 500)}`
      );
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error(
        `llama-bench returned empty or non-array JSON. Expected an array with prompt and ` +
          `generation entries. Raw output (truncated):\n${stdout.slice(0, 500)}`
      );
    }

    const promptEntry = entries.find((e) => e.n_prompt > 0 && e.n_gen === 0);
    const genEntry = entries.find((e) => e.n_gen > 0 && e.n_prompt === 0);

    if (!promptEntry || !genEntry) {
      throw new Error(
        `Expected both prompt and generation entries from llama-bench. Got ${entries.length} entries.`
      );
    }

    // Validate required fields exist and have expected types.
    if (!Array.isArray(promptEntry.samples_ts) || !Array.isArray(genEntry.samples_ts)) {
      throw new Error(
        `llama-bench JSON is missing 'samples_ts' arrays. This may indicate an older build. ` +
          `Minimum required: b${LLAMA_CPP_MIN_BUILD}.`
      );
    }
    if (!isFinite(promptEntry.avg_ts) || !isFinite(genEntry.avg_ts)) {
      throw new Error(
        `llama-bench returned non-numeric avg_ts values. ` +
          `prompt avg_ts=${promptEntry.avg_ts}, gen avg_ts=${genEntry.avg_ts}`
      );
    }

    // Build per-trial data from samples_ts arrays
    const numTrials = Math.min(promptEntry.samples_ts.length, genEntry.samples_ts.length);
    const trials: BenchTrial[] = [];

    const peakMemoryGb = mem.peakMb / 1024;
    const idleMemoryGb = mem.idleMb / 1024;

    for (let i = 0; i < numTrials; i++) {
      trials.push({
        promptTps: promptEntry.samples_ts[i]!,
        generationTps: genEntry.samples_ts[i]!,
        peakMemoryGb,
      });
    }

    return {
      promptTokens,
      completionTokens: genTokens,
      trials,
      averages: {
        promptTps: promptEntry.avg_ts,
        generationTps: genEntry.avg_ts,
        peakMemoryGb,
        idleMemoryGb,
      },
    };
  }
}
