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
    } catch {}

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
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;

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
