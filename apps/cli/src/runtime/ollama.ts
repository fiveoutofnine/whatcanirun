import { ollamaModelName } from '../model/ollama.ts';
import { warn } from '../utils/log.ts';
import type { BenchOpts, BenchResult, BenchTrial, RuntimeAdapter, RuntimeInfo } from './types.ts';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const OLLAMA_BASE_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';

/**
 * A deterministic block of common English words used to build synthetic prompts.
 * Repeated as needed to approximate the target token count.
 * ~5 characters per token is a conservative estimate for English text.
 */
const PROMPT_WORD_POOL = [
  'The quick brown fox jumps over the lazy dog near the riverbank where tall reeds sway gently',
  'in the warm afternoon breeze while birds sing melodious songs from the branches of ancient oak',
  'trees that have stood for centuries watching the world change around them season after season',
  'as farmers tend their golden wheat fields and children play in meadows filled with wildflowers',
  'under skies painted in brilliant shades of blue and white clouds drifting slowly toward the',
  'distant mountains whose snow covered peaks glisten in the sunlight creating a breathtaking',
  'panorama that stretches across the horizon reminding all who gaze upon it of the magnificent',
  'beauty found throughout the natural world from the deepest ocean trenches to the highest alpine',
  'summits where eagles soar on thermal currents scanning the landscape below for signs of movement',
  'among the rocks and scrubland that dot the rugged terrain of this vast and ancient continent',
].join(' ');

const CHARS_PER_TOKEN = 5;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

interface OllamaPsModel {
  name: string;
  model: string;
  size: number;
  size_vram: number;
  digest: string;
  expires_at: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildPrompt(targetTokens: number): string {
  const targetLength = targetTokens * CHARS_PER_TOKEN;
  let prompt = '';
  while (prompt.length < targetLength) {
    prompt += PROMPT_WORD_POOL + ' ';
  }
  return prompt.slice(0, targetLength);
}

export async function ollamaFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const resp = await fetch(`${OLLAMA_BASE_URL}${path}`, opts);
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Ollama API ${path} returned ${resp.status}: ${body}`);
  }
  return resp.json() as Promise<T>;
}

// -----------------------------------------------------------------------------
// Adapter
// -----------------------------------------------------------------------------

export class OllamaAdapter implements RuntimeAdapter {
  name = 'ollama';

  async detect(): Promise<RuntimeInfo | null> {
    // Check that the ollama CLI is installed.
    try {
      const proc = Bun.spawn(['ollama', '--version'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const stdout = (await new Response(proc.stdout).text()).trim();
      const code = await proc.exited;
      if (code !== 0) return null;

      // Output format: "ollama version 0.5.1"
      const cliMatch = stdout.match(/ollama\s+version\s+(\S+)/i);
      if (!cliMatch) {
        warn(`Could not parse ollama version from "${stdout}".`);
      }
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      warn(`Failed to run ollama: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }

    // Verify the server is running and get its version.
    try {
      const { version } = await ollamaFetch<{ version: string }>('/api/version');
      return { name: this.name, version };
    } catch {
      throw new Error(
        'Ollama CLI is installed but the server is not running. ' +
          'Start it with `ollama serve` or launch the Ollama app.'
      );
    }
  }

  async benchmark(opts: BenchOpts): Promise<BenchResult> {
    const modelName = ollamaModelName(opts.model);

    // Verify the model exists by checking /api/tags (more reliable than /api/show
    // which can fail due to filesystem errors on some setups).
    try {
      const tags = await ollamaFetch<{
        models?: Array<{ name: string; model: string }>;
      }>('/api/tags');
      const found = tags.models?.some(
        (m) => m.name === modelName || m.model === modelName
      );
      if (!found) {
        throw new Error(
          `Model '${modelName}' not found in Ollama. Pull it first with \`ollama pull ${modelName}\`.`
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('not found in Ollama')) throw e;
      throw new Error(
        `Could not verify model availability: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    // Warmup: load the model into memory with a tiny generation.
    opts.onProgress?.('Warming up…');
    await ollamaFetch<OllamaChatResponse>('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'hello' }],
        stream: false,
        keep_alive: '10m',
        options: { num_predict: 1 },
      }),
      signal: opts.signal,
    });

    // Measure memory from /api/ps after model is loaded.
    let memoryGb = 0;
    try {
      const ps = await ollamaFetch<{ models: OllamaPsModel[] }>('/api/ps');
      const running = ps.models?.find(
        (m) => m.name === modelName || m.model === modelName
      );
      if (running) {
        memoryGb = running.size / (1024 * 1024 * 1024);
      }
    } catch (e: unknown) {
      warn(`Could not read Ollama memory usage: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Build a synthetic prompt targeting the requested token count.
    const prompt = buildPrompt(opts.promptTokens);

    // Run trials.
    const trials: BenchTrial[] = [];
    let actualPromptTokens = opts.promptTokens;

    for (let i = 0; i < opts.numTrials; i++) {
      opts.signal?.throwIfAborted();

      const resp = await ollamaFetch<OllamaChatResponse>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          keep_alive: '10m',
          options: { num_predict: opts.genTokens },
        }),
        signal: opts.signal,
      });

      const promptTps =
        resp.prompt_eval_duration > 0
          ? resp.prompt_eval_count / (resp.prompt_eval_duration / 1e9)
          : 0;
      const generationTps =
        resp.eval_duration > 0 ? resp.eval_count / (resp.eval_duration / 1e9) : 0;

      // Record actual prompt token count from first trial.
      if (i === 0) {
        actualPromptTokens = resp.prompt_eval_count || opts.promptTokens;
      }

      trials.push({
        promptTps,
        generationTps,
        peakMemoryGb: memoryGb,
      });

      const tps = generationTps > 0 ? ` — ${generationTps.toFixed(1)} tok/s` : '';
      opts.onProgress?.(`Trial ${i + 1}/${opts.numTrials}${tps}`);
    }

    // Compute averages.
    const avgPromptTps = trials.reduce((s, t) => s + t.promptTps, 0) / trials.length;
    const avgGenTps = trials.reduce((s, t) => s + t.generationTps, 0) / trials.length;

    return {
      promptTokens: actualPromptTokens,
      completionTokens: opts.genTokens,
      trials,
      averages: {
        promptTps: avgPromptTps,
        generationTps: avgGenTps,
        peakMemoryGb: memoryGb,
        idleMemoryGb: memoryGb,
      },
    };
  }
}
