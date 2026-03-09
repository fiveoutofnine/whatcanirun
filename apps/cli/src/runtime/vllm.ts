import type { GenerateOpts, RuntimeAdapter, RuntimeInfo, TokenEvent } from './types.ts';

export class VllmAdapter implements RuntimeAdapter {
  name = 'vllm';
  private pid: number | null = null;
  private serverUrl = 'http://localhost:8000';

  async detect(): Promise<RuntimeInfo | null> {
    try {
      const proc = Bun.spawn(['python3', '-c', 'import vllm; print(vllm.__version__)'], {
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
    // vLLM uses an OpenAI-compatible API
    // Assumes a vllm server is running (vllm serve <model>)
    const body = {
      model: opts.modelPath,
      prompt: opts.prompt,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      top_p: opts.topP,
      stream: true,
    };

    const response = await fetch(`${this.serverUrl}/v1/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      yield {
        type: 'error',
        message: `vLLM server returned ${response.status}: ${await response.text()}`,
        timestamp: performance.now(),
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield {
        type: 'error',
        message: 'No response body from vLLM server',
        timestamp: performance.now(),
      };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let tokenCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.text;
            if (text) {
              tokenCount++;
              yield {
                type: 'token',
                text,
                timestamp: performance.now(),
              } as const;
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield {
      type: 'done',
      timestamp: performance.now(),
      output_tokens: tokenCount,
    } as const;
  }

  getProcessId(): number | null {
    return this.pid;
  }
}
