import type { BenchOpts, BenchResult, BenchTrial, RuntimeAdapter, RuntimeInfo } from './types.ts';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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
          return {
            name: this.name,
            version: `b${versionMatch[1]}`,
            build_flags: 'metal',
          };
        }

        const fallbackMatch = output.match(/version:\s*(\S+)|llama\.cpp\s+(\S+)|build:\s*(\d+)/i);
        const version =
          fallbackMatch?.[1] || fallbackMatch?.[2] || fallbackMatch?.[3] || output.slice(0, 50);
        return { name: this.name, version };
      } catch (e: unknown) {
        if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }
        console.warn(
          `Warning: failed to run ${bin}: ${e instanceof Error ? e.message : String(e)}`
        );
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
    ];

    const proc = Bun.spawn(['llama-bench', ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Stream both stdout and stderr concurrently to avoid pipe buffer deadlock.
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let trialsSeen = 0;
    const totalTrials = opts.numTrials * 2;

    const streamStdout = (async () => {
      const decoder = new TextDecoder();
      for await (const chunk of proc.stdout) {
        stdoutChunks.push(decoder.decode(chunk, { stream: true }));
      }
    })();

    const streamStderr = (async () => {
      let buffer = '';
      const decoder = new TextDecoder();
      for await (const chunk of proc.stderr) {
        const text = decoder.decode(chunk, { stream: true });
        stderrChunks.push(text);
        buffer += text;

        const lines = buffer.split('\n');
        buffer = lines.pop()!;
        for (const line of lines) {
          if (/^\s*\|/.test(line) && /\d/.test(line)) {
            trialsSeen++;
            const fields = line.split('|').filter((f) => f.trim());
            const tpsField = fields[fields.length - 1]?.trim();
            const tps =
              tpsField && /^[\d.]+$/.test(tpsField)
                ? ` — ${parseFloat(tpsField).toFixed(1)} tok/s`
                : '';
            opts.onProgress?.(`Trial ${trialsSeen}/${totalTrials}${tps}`);
          }
        }
      }
      if (buffer) stderrChunks.push(buffer);
    })();

    await Promise.all([streamStdout, streamStderr]);
    const stdout = stdoutChunks.join('');
    const stderr = stderrChunks.join('');
    const code = await proc.exited;

    if (code !== 0) {
      const errMsg = stderr.trim() || stdout.trim() || `exit code ${code}`;
      throw new Error(`llama-bench failed: ${errMsg}`);
    }

    return this.parseOutput(stdout, opts.promptTokens, opts.genTokens);
  }

  /**
   * Parse llama-bench -o json output.
   * Returns an array with two entries: one for prompt (n_prompt>0, n_gen==0)
   * and one for generation (n_gen>0, n_prompt==0).
   */
  private parseOutput(stdout: string, promptTokens: number, genTokens: number): BenchResult {
    let entries: LlamaBenchEntry[];
    try {
      entries = JSON.parse(stdout);
    } catch {
      throw new Error(
        `Could not parse llama-bench JSON output. Raw output:\n${stdout}\nPlease file an issue.`
      );
    }

    const promptEntry = entries.find((e) => e.n_prompt > 0 && e.n_gen === 0);
    const genEntry = entries.find((e) => e.n_gen > 0 && e.n_prompt === 0);

    if (!promptEntry || !genEntry) {
      throw new Error(
        `Expected both prompt and generation entries from llama-bench. Got ${entries.length} entries.`
      );
    }

    // Build per-trial data from samples_ts arrays
    const numTrials = Math.min(promptEntry.samples_ts.length, genEntry.samples_ts.length);
    const trials: BenchTrial[] = [];

    for (let i = 0; i < numTrials; i++) {
      trials.push({
        promptTps: promptEntry.samples_ts[i]!,
        generationTps: genEntry.samples_ts[i]!,
        peakMemoryGb: 0, // llama-bench doesn't report memory
      });
    }

    return {
      promptTokens,
      completionTokens: genTokens,
      trials,
      averages: {
        promptTps: promptEntry.avg_ts,
        generationTps: genEntry.avg_ts,
        peakMemoryGb: 0,
      },
    };
  }
}
