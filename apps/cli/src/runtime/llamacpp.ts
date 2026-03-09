import { join } from "path";
import { tmpdir } from "os";
import { mkdtempSync, rmSync } from "fs";
import type {
  RuntimeAdapter,
  RuntimeInfo,
  GenerateOpts,
  TokenEvent,
} from "./types.ts";

export class LlamaCppAdapter implements RuntimeAdapter {
  name = "llama.cpp";
  private pid: number | null = null;

  async detect(): Promise<RuntimeInfo | null> {
    for (const bin of ["llama-cli", "llama-cpp", "main"]) {
      try {
        const proc = Bun.spawn([bin, "--version"], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const stdout = (await new Response(proc.stdout).text()).trim();
        const stderr = (await new Response(proc.stderr).text()).trim();
        const code = await proc.exited;
        if (code !== 0) continue;

        const output = stdout || stderr;
        const versionMatch = output.match(
          /version:\s*(\S+)|llama\.cpp\s+(\S+)|build:\s*(\d+)/i,
        );
        const version =
          versionMatch?.[1] ||
          versionMatch?.[2] ||
          versionMatch?.[3] ||
          output.slice(0, 50);
        return { version };
      } catch {
        continue;
      }
    }
    return null;
  }

  private async findBinary(): Promise<string> {
    for (const candidate of ["llama-cli", "llama-cpp", "main"]) {
      try {
        const check = Bun.spawn(["which", candidate], {
          stdout: "pipe",
          stderr: "ignore",
        });
        const path = (await new Response(check.stdout).text()).trim();
        const code = await check.exited;
        if (code === 0 && path) return candidate;
      } catch {}
    }
    return "llama-cli";
  }

  async *generate(
    opts: GenerateOpts,
  ): AsyncGenerator<TokenEvent, void, unknown> {
    // Write prompt to temp file to handle long/complex prompts safely
    const tmpDir = mkdtempSync(join(tmpdir(), "whatcanirun-llamacpp-"));
    const promptPath = join(tmpDir, "prompt.txt");
    await Bun.write(promptPath, opts.prompt);

    const bin = await this.findBinary();
    const args = [
      "-m",
      opts.modelPath,
      "-f",
      promptPath,
      "-n",
      String(opts.maxTokens),
      "--temp",
      String(opts.temperature),
      "--top-p",
      String(opts.topP),
      "--log-disable",
      "-no-display-prompt",
    ];

    if (opts.runtimeFlags) {
      args.push(...opts.runtimeFlags.split(/\s+/));
    }

    const proc = Bun.spawn([bin, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    this.pid = proc.pid;

    const decoder = new TextDecoder();
    const reader = proc.stdout.getReader();
    let tokenCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        if (!text) continue;

        tokenCount++;
        yield {
          type: "token" as const,
          text,
          timestamp: performance.now(),
        };
      }
    } finally {
      reader.releaseLock();
      await proc.exited;
      rmSync(tmpDir, { recursive: true, force: true });
    }

    yield {
      type: "done" as const,
      timestamp: performance.now(),
      output_tokens: tokenCount,
    };
  }

  getProcessId(): number | null {
    return this.pid;
  }
}
