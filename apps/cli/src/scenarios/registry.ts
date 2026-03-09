import type { ScenarioDefinition } from "./types.ts";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "../../fixtures");

async function loadPrompt(filename: string): Promise<string> {
  const path = resolve(fixturesDir, filename);
  return Bun.file(path).text();
}

export async function getScenario(id: string): Promise<ScenarioDefinition> {
  switch (id) {
    case "chat_short_v1": {
      const prompt = await loadPrompt("chat_short_v1.txt");
      return {
        id: "chat_short_v1",
        description: "Interactive chat latency + throughput",
        input_tokens: 512,
        output_tokens: 256,
        warmups: 2,
        trials: 5,
        batch_size: 1,
        temperature: 0,
        top_p: 1,
        prompt,
      };
    }
    case "chat_long_v1": {
      const prompt = await loadPrompt("chat_long_v1.txt");
      return {
        id: "chat_long_v1",
        description: "Prefill + memory stress",
        input_tokens: 8192,
        output_tokens: 128,
        warmups: 2,
        trials: 5,
        batch_size: 1,
        temperature: 0,
        top_p: 1,
        prompt,
      };
    }
    default:
      throw new Error(
        `Unknown scenario '${id}'. Valid: chat_short_v1, chat_long_v1`,
      );
  }
}

export const VALID_SCENARIOS = ["chat_short_v1", "chat_long_v1"] as const;
