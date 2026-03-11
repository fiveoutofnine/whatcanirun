import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import type { GenerateOpts, RuntimeAdapter, RuntimeInfo, TokenEvent } from './types.ts';

export class LlamaCppAdapter implements RuntimeAdapter {
  name = 'llama.cpp';
  private pid: number | null = null;

  async detect(): Promise<RuntimeInfo | null> {
    for (const bin of ['llama-completion', 'llama-cli', 'llama-cpp', 'main']) {
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
        const versionMatch = output.match(/version:\s*(\S+)|llama\.cpp\s+(\S+)|build:\s*(\d+)/i);
        const version =
          versionMatch?.[1] || versionMatch?.[2] || versionMatch?.[3] || output.slice(0, 50);
        return { version };
      } catch {
        continue;
      }
    }
    return null;
  }

  private async findBinary(): Promise<string> {
    // Prefer llama-completion for clean stdout (no conversation UI)
    for (const candidate of ['llama-completion', 'llama-cli', 'llama-cpp', 'main']) {
      try {
        const check = Bun.spawn(['which', candidate], {
          stdout: 'pipe',
          stderr: 'ignore',
        });
        const path = (await new Response(check.stdout).text()).trim();
        const code = await check.exited;
        if (code === 0 && path) return candidate;
      } catch {}
    }
    return 'llama-completion';
  }

  async *generate(opts: GenerateOpts): AsyncGenerator<TokenEvent, void, unknown> {
    // Write prompt to temp file to handle long/complex prompts safely
    const tmpDir = mkdtempSync(join(tmpdir(), 'whatcanirun-llamacpp-'));
    const promptPath = join(tmpDir, 'prompt.txt');
    await Bun.write(promptPath, opts.prompt);

    const bin = await this.findBinary();
    const args = [
      '-m',
      opts.modelPath,
      '-f',
      promptPath,
      '-n',
      String(opts.maxTokens),
      '--temp',
      String(opts.temperature),
      '--top-p',
      String(opts.topP),
      '--no-display-prompt',
    ];

    if (opts.runtimeFlags) {
      args.push(...opts.runtimeFlags.split(/\s+/));
    }

    const proc = Bun.spawn([bin, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    this.pid = proc.pid;

    // Queue-based approach: both stdout and stderr push events, generator pulls them
    const queue: TokenEvent[] = [];
    let resolve: (() => void) | null = null;
    let stdoutDone = false;
    let stderrDone = false;
    const stderrLines: string[] = [];

    function push(event: TokenEvent) {
      queue.push(event);
      if (resolve) {
        resolve();
        resolve = null;
      }
    }

    function waitForEvent(): Promise<void> {
      if (queue.length > 0 || (stdoutDone && stderrDone)) return Promise.resolve();
      return new Promise<void>((r) => {
        resolve = r;
      });
    }

    // Read stderr line-by-line for status updates during model loading
    const readStderr = async () => {
      const decoder = new TextDecoder();
      const reader = proc.stderr.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              stderrLines.push(trimmed);
              push({
                type: 'status' as const,
                message: trimmed,
                timestamp: performance.now(),
              });
            }
          }
        }
        if (buffer.trim()) {
          stderrLines.push(buffer.trim());
        }
      } finally {
        reader.releaseLock();
        stderrDone = true;
        // Wake up consumer in case it's waiting
        if (resolve) {
          resolve();
          resolve = null;
        }
      }
    };

    // Read stdout for tokens
    let tokenCount = 0;
    const readStdout = async () => {
      const decoder = new TextDecoder();
      const reader = proc.stdout.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          if (!text) continue;
          tokenCount++;
          push({
            type: 'token' as const,
            text,
            timestamp: performance.now(),
          });
        }
      } finally {
        reader.releaseLock();
        stdoutDone = true;
        if (resolve) {
          resolve();
          resolve = null;
        }
      }
    };

    // Start both readers
    const stderrTask = readStderr();
    const stdoutTask = readStdout();

    // Yield events as they arrive from either stream
    while (true) {
      await waitForEvent();
      while (queue.length > 0) {
        yield queue.shift()!;
      }
      if (stdoutDone && stderrDone && queue.length === 0) break;
    }

    await Promise.all([stderrTask, stdoutTask]);
    const exitCode = await proc.exited;
    rmSync(tmpDir, { recursive: true, force: true });

    if (exitCode !== 0) {
      const errorLine =
        stderrLines.find((l) => /error/i.test(l)) ||
        stderrLines[stderrLines.length - 1] ||
        `exit code ${exitCode}`;
      yield {
        type: 'error' as const,
        message: errorLine,
        timestamp: performance.now(),
      };
      return;
    }

    yield {
      type: 'done' as const,
      timestamp: performance.now(),
      output_tokens: tokenCount,
    };
  }

  getProcessId(): number | null {
    return this.pid;
  }
}
