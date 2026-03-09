import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import type { GenerateOpts, RuntimeAdapter, RuntimeInfo, TokenEvent } from './types.ts';

export class MlxAdapter implements RuntimeAdapter {
  name = 'mlx';
  private pid: number | null = null;

  async detect(): Promise<RuntimeInfo | null> {
    try {
      const proc = Bun.spawn(['python3', '-c', 'import mlx_lm; print(mlx_lm.__version__)'], {
        stdout: 'pipe',
        stderr: 'ignore',
      });
      const version = (await new Response(proc.stdout).text()).trim();
      const code = await proc.exited;
      if (code !== 0 || !version) return null;
      return { version };
    } catch {
      return null;
    }
  }

  async *generate(opts: GenerateOpts): AsyncGenerator<TokenEvent, void, unknown> {
    // Write prompt and config to temp files to avoid shell escaping issues
    const tmpDir = mkdtempSync(join(tmpdir(), 'whatcanirun-mlx-'));
    const configPath = join(tmpDir, 'config.json');
    const scriptPath = join(tmpDir, 'run.py');

    const config = {
      model_path: opts.modelPath,
      prompt: opts.prompt,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      top_p: opts.topP,
    };

    await Bun.write(configPath, JSON.stringify(config));

    const script = `
import sys, time, json

with open(${JSON.stringify(configPath)}) as f:
    config = json.load(f)

from mlx_lm import load, generate
from mlx_lm.utils import stream_generate

model, tokenizer = load(config["model_path"])

first_token = True
token_count = 0

for response in stream_generate(
    model, tokenizer,
    prompt=config["prompt"],
    max_tokens=config["max_tokens"],
    temp=config["temperature"],
    top_p=config["top_p"],
):
    now = time.time() * 1000
    text = response.text if hasattr(response, 'text') else str(response)
    token_count += 1
    event = {"type": "token", "text": text, "timestamp": now}
    print(json.dumps(event), flush=True)

done_event = {"type": "done", "timestamp": time.time() * 1000, "output_tokens": token_count}
print(json.dumps(done_event), flush=True)
`;

    await Bun.write(scriptPath, script);

    const proc = Bun.spawn(['python3', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    this.pid = proc.pid;

    const decoder = new TextDecoder();
    const reader = proc.stdout.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as TokenEvent;
            yield event;
          } catch {}
        }
      }

      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as TokenEvent;
          yield event;
        } catch {}
      }
    } finally {
      reader.releaseLock();
      await proc.exited;
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  getProcessId(): number | null {
    return this.pid;
  }
}
