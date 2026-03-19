import type { BenchOpts, BenchResult, BenchTrial, RuntimeAdapter, RuntimeInfo } from './types.ts';

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
        this.useCli = true;
        return { name: this.name, version };
      }
    } catch (e: unknown) {
      if (!(e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT')) {
        console.warn(
          `Warning: mlx_lm CLI found but failed: ${e instanceof Error ? e.message : String(e)}`
        );
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
      return { name: this.name, version };
    } catch {
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
          if (/Fetching|Downloading|downloading/i.test(seg)) {
            // Extract percentage if present (e.g. "Downloading: 45%").
            const pctMatch = seg.match(/(\d+)%/);
            if (pctMatch) {
              opts.onProgress?.(`Downloading model... ${pctMatch[1]}%`);
            } else {
              opts.onProgress?.('Downloading model...');
            }
          }
        }
      }
    })();

    await Promise.all([streamStdout, streamStderr]);
    const code = await proc.exited;

    const stdout = stdoutChunks.join('');
    const stderr = stderrChunks.join('');

    if (code !== 0) {
      const errMsg = stderr.trim() || stdout.trim() || `exit code ${code}`;
      throw new Error(`mlx_lm.benchmark failed: ${errMsg}`);
    }

    return this.parseOutput(stdout, opts.promptTokens, opts.genTokens);
  }

  /**
   * Parse mlx_lm.benchmark stdout. Expected format:
   *   Running warmup..
   *   Timing with prompt_tokens=64, generation_tokens=32, batch_size=1.
   *   Trial 1:  prompt_tps=1334.858, generation_tps=282.768, peak_memory=0.429
   *   Trial 2:  prompt_tps=1259.967, generation_tps=252.029, peak_memory=0.429
   *   Averages: prompt_tps=1297.412, generation_tps=267.399, peak_memory=0.429
   */
  private parseOutput(stdout: string, promptTokens: number, genTokens: number): BenchResult {
    const lines = stdout.split('\n');
    const trials: BenchTrial[] = [];
    let averages: BenchResult['averages'] | null = null;

    const metricsPattern = /prompt_tps=([\d.]+),\s*generation_tps=([\d.]+),\s*peak_memory=([\d.]+)/;

    for (const line of lines) {
      const match = line.match(metricsPattern);
      if (!match) continue;

      const parsed = {
        promptTps: parseFloat(match[1]!),
        generationTps: parseFloat(match[2]!),
        peakMemoryGb: parseFloat(match[3]!),
      };

      if (line.startsWith('Averages:')) {
        averages = parsed;
      } else if (/^\s*Trial\s+\d+:/.test(line)) {
        trials.push(parsed);
      }
    }

    if (trials.length === 0) {
      throw new Error(
        `Could not parse benchmark output. Raw output:\n${stdout}\nPlease file an issue.`
      );
    }

    // If no averages line, compute from trials
    if (!averages) {
      averages = {
        promptTps: trials.reduce((s, t) => s + t.promptTps, 0) / trials.length,
        generationTps: trials.reduce((s, t) => s + t.generationTps, 0) / trials.length,
        peakMemoryGb: Math.max(...trials.map((t) => t.peakMemoryGb)),
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
