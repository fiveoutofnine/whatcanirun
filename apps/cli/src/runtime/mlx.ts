import { warn } from '../utils/log.ts';
import { monitorProcessMemory } from './memory.ts';
import type { BenchOpts, BenchResult, BenchTrial, RuntimeAdapter, RuntimeInfo } from './types.ts';
import { isVersionAtLeast, MLX_LM_MIN_VERSION, UnsupportedVersionError } from './version.ts';

// -----------------------------------------------------------------------------
// Adapter
// -----------------------------------------------------------------------------

export class MlxAdapter implements RuntimeAdapter {
  name = 'mlx_lm';

  private useCli = false;

  async detect(): Promise<RuntimeInfo | null> {
    // Try the standalone CLI first (e.g. Homebrew install).
    try {
      const proc = Bun.spawn(['mlx_lm', '--version'], {
        stdout: 'pipe',
        stderr: 'ignore',
      });
      const version = (await new Response(proc.stdout).text()).trim();
      const code = await proc.exited;
      if (code === 0 && version) {
        if (!isVersionAtLeast(version, MLX_LM_MIN_VERSION)) {
          throw new UnsupportedVersionError('mlx_lm', version, MLX_LM_MIN_VERSION);
        }
        this.useCli = true;
        return { name: this.name, version };
      }
    } catch (e: unknown) {
      if (e instanceof UnsupportedVersionError) throw e;
      if (!(e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT')) {
        warn(`mlx_lm CLI found but failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Fall back to Python module.
    try {
      const proc = Bun.spawn(['python3', '-c', 'import mlx_lm; print(mlx_lm.__version__)'], {
        stdout: 'pipe',
        stderr: 'ignore',
      });
      const version = (await new Response(proc.stdout).text()).trim();
      const code = await proc.exited;
      if (code !== 0 || !version) return null;
      if (!isVersionAtLeast(version, MLX_LM_MIN_VERSION)) {
        throw new UnsupportedVersionError('mlx_lm', version, MLX_LM_MIN_VERSION);
      }
      return { name: this.name, version };
    } catch (e: unknown) {
      if (e instanceof UnsupportedVersionError) throw e;
      return null;
    }
  }

  async benchmark(opts: BenchOpts): Promise<BenchResult> {
    const benchArgs = [
      '--model',
      opts.model,
      '--prompt-tokens',
      String(opts.promptTokens),
      '--generation-tokens',
      String(opts.genTokens),
      '--num-trials',
      String(opts.numTrials),
    ];

    const cmd = this.useCli
      ? ['mlx_lm', 'benchmark', ...benchArgs]
      : ['python3', '-m', 'mlx_lm.benchmark', ...benchArgs];

    const proc = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    // Poll process RSS for consistent memory measurement across runtimes.
    // mlx_lm reports `peak_memory` from mx.get_peak_memory() (framework-level),
    // but we use external RSS polling for cross-runtime parity with llama.cpp.
    const memMonitor = monitorProcessMemory(proc.pid);

    // Stream both stdout and stderr concurrently for progress reporting.
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const streamStdout = (async () => {
      let buffer = '';
      const decoder = new TextDecoder();
      for await (const chunk of proc.stdout) {
        const text = decoder.decode(chunk, { stream: true });
        stdoutChunks.push(text);
        buffer += text;

        const lines = buffer.split('\n');
        buffer = lines.pop()!;
        for (const line of lines) {
          if (/warmup/i.test(line)) {
            opts.onProgress?.('Warming up...');
          } else {
            const trialMatch = line.match(/^\s*Trial\s+(\d+):/);
            if (trialMatch) {
              const tpsMatch = line.match(/generation_tps=([\d.]+)/);
              const tps = tpsMatch ? ` — ${parseFloat(tpsMatch[1]!).toFixed(1)} tok/s` : '';
              opts.onProgress?.(`Trial ${trialMatch[1]}/${opts.numTrials}${tps}`);
            }
          }
        }
      }
      if (buffer) stdoutChunks.push('');
    })();

    const streamStderr = (async () => {
      const decoder = new TextDecoder();
      for await (const chunk of proc.stderr) {
        const text = decoder.decode(chunk, { stream: true });
        stderrChunks.push(text);

        // HF download progress uses \r for progress bars.
        const segments = text.split(/[\r\n]/);
        for (const seg of segments) {
          // Overall file-count progress: "Fetching N files: XX%|..."
          const fetchMatch = seg.match(/Fetching\s+\d+\s+files?.*?(\d+)%/i);
          if (fetchMatch) {
            opts.onProgress?.(`Downloading model... ${fetchMatch[1]}%`);
          } else if (/Downloading|downloading/i.test(seg)) {
            // Per-file download — signal activity but don't extract percentage
            // to avoid overriding the overall Fetching progress.
            opts.onProgress?.('Downloading model...');
          }
        }
      }
    })();

    await Promise.all([streamStdout, streamStderr]);
    const code = await proc.exited;

    const stdout = stdoutChunks.join('');
    const stderr = stderrChunks.join('');

    const mem = memMonitor.stop();

    if (code !== 0) {
      const output = stderr + stdout;

      if (/RepositoryNotFoundError|404 Client Error.*Repository Not Found/i.test(output)) {
        throw new Error(
          `Model not found: '${opts.model}'. Check the HuggingFace repo ID and try again.`
        );
      }
      if (/EntryNotFoundError/i.test(output)) {
        throw new Error(
          `Model files not found in '${opts.model}'. The repository may not contain a compatible model.`
        );
      }
      if (/GatedRepoError|Access to model .* is restricted/i.test(output)) {
        throw new Error(
          `Access to '${opts.model}' is restricted. Accept the model's terms at https://huggingface.co/${opts.model} and set a HF token.`
        );
      }
      if (/RevisionNotFoundError/i.test(output)) {
        throw new Error(
          `Revision not found for '${opts.model}'. The repository may have been updated or removed.`
        );
      }

      const errMsg = stderr.trim() || stdout.trim() || `exit code ${code}`;
      throw new Error(`mlx_lm.benchmark failed: ${errMsg}`);
    }

    return this.parseOutput(stdout, opts.promptTokens, opts.genTokens, opts.numTrials, mem);
  }

  /**
   * Parse mlx_lm.benchmark stdout.
   *
   * Expected format (text, no JSON option available):
   *
   *   Running warmup..
   *   Timing with prompt_tokens=64, generation_tokens=32, batch_size=1.
   *   Trial 1:  prompt_tps=1334.858, generation_tps=282.768, peak_memory=0.429
   *   Trial 2:  prompt_tps=1259.967, generation_tps=252.029, peak_memory=0.429
   *   Averages: prompt_tps=1297.412, generation_tps=267.399, peak_memory=0.429
   *
   * Line types:
   *   "Trial N:" — per-trial metrics, parsed via metricsPattern regex
   *   "Averages:" — aggregate metrics (optional; computed from trials if absent)
   *   "Running warmup.." — progress signal only
   *   "Timing with ..." — config echo, not parsed
   *
   * Fields extracted per line:
   *   prompt_tps (float, tok/s) — prompt processing throughput
   *   generation_tps (float, tok/s) — token generation throughput
   *   peak_memory (float, GB) — framework-level peak from mx.get_peak_memory()
   *
   * Note: peak_memory is MLX framework allocation, NOT process RSS. We use
   * externally-polled RSS (passed via `mem` param) as the canonical memory
   * metric for cross-runtime parity with llama.cpp.
   *
   * Minimum stable version: ${MLX_LM_MIN_VERSION}
   */
  private parseOutput(
    stdout: string,
    promptTokens: number,
    genTokens: number,
    numTrials: number,
    mem: { peakMb: number; idleMb: number }
  ): BenchResult {
    const lines = stdout.split('\n');
    const trials: BenchTrial[] = [];
    let averages: BenchResult['averages'] | null = null;

    const metricsPattern = /prompt_tps=([\d.]+),\s*generation_tps=([\d.]+),\s*peak_memory=([\d.]+)/;

    const peakMemoryGb = mem.peakMb / 1024;
    const idleMemoryGb = mem.idleMb / 1024;

    for (const line of lines) {
      const match = line.match(metricsPattern);
      if (!match) continue;

      const promptTps = parseFloat(match[1]!);
      const generationTps = parseFloat(match[2]!);

      // Guard against NaN from malformed lines — skip rather than corrupt results.
      if (!isFinite(promptTps) || !isFinite(generationTps)) {
        continue;
      }

      if (line.startsWith('Averages:')) {
        averages = {
          promptTps,
          generationTps,
          peakMemoryGb,
          idleMemoryGb,
        };
      } else if (/^\s*Trial\s+\d+:/.test(line)) {
        trials.push({
          promptTps,
          generationTps,
          peakMemoryGb,
        });
      }
    }

    if (trials.length === 0) {
      throw new Error(
        `Could not parse mlx_lm.benchmark output. Expected lines matching:\n` +
          `  "Trial N: prompt_tps=..., generation_tps=..., peak_memory=..."\n\n` +
          `Minimum supported version: ${MLX_LM_MIN_VERSION}. ` +
          `Upgrade with: pip install --upgrade mlx-lm\n\n` +
          `Raw output (truncated):\n${stdout.slice(0, 500)}`
      );
    }

    if (trials.length !== numTrials) {
      warn(
        `expected ${numTrials} trials but parsed ${trials.length}. Results will use the ${trials.length} trials that were parsed.`
      );
    }

    // If no averages line, compute from trials
    if (!averages) {
      averages = {
        promptTps: trials.reduce((s, t) => s + t.promptTps, 0) / trials.length,
        generationTps: trials.reduce((s, t) => s + t.generationTps, 0) / trials.length,
        peakMemoryGb,
        idleMemoryGb,
      };
    }

    return {
      promptTokens,
      completionTokens: genTokens,
      trials,
      averages,
    };
  }
}
