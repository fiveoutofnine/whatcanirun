import { existsSync, statSync, readFileSync } from "fs";
import { resolve, basename, extname } from "path";
import { homedir } from "os";
import { createHash } from "crypto";

export interface ModelInfo {
  display_name: string;
  path: string;
  format: string;
  quant: string | null;
  artifact_sha256: string;
}

const QUANT_PATTERNS = [
  /\b(q2_k)\b/i,
  /\b(q3_k_[sml])\b/i,
  /\b(q4_0)\b/i,
  /\b(q4_1)\b/i,
  /\b(q4_k_[sml])\b/i,
  /\b(q5_0)\b/i,
  /\b(q5_1)\b/i,
  /\b(q5_k_[sml])\b/i,
  /\b(q6_k)\b/i,
  /\b(q8_0)\b/i,
  /\b(fp16)\b/i,
  /\b(fp32)\b/i,
  /\b(f16)\b/i,
  /\b(f32)\b/i,
  /\b(awq)\b/i,
  /\b(gptq)\b/i,
  /\b(bnb)\b/i,
];

export function inferQuant(filename: string): string | null {
  for (const pattern of QUANT_PATTERNS) {
    const match = filename.match(pattern);
    if (match) return match[1]!.toLowerCase();
  }
  return null;
}

export function inferFormat(modelPath: string): string {
  const ext = extname(modelPath).toLowerCase();
  if (ext === ".gguf") return "gguf";
  if (ext === ".safetensors") return "safetensors";
  if (ext === ".bin") return "bin";
  if (ext === ".pt" || ext === ".pth") return "pytorch";

  // Check if it's an mlx directory
  const configPath = resolve(modelPath, "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      if (config.model_type) return "mlx";
    } catch {}
  }

  return "unknown";
}

async function loadModelAliases(): Promise<Record<string, string>> {
  const configPath = resolve(homedir(), ".config", "whatcanirun", "models.toml");
  if (!existsSync(configPath)) return {};

  try {
    const content = await Bun.file(configPath).text();
    const { parse } = await import("smol-toml");
    const config = parse(content);
    return (config.models as Record<string, string>) || {};
  } catch {
    return {};
  }
}

export async function resolveModel(modelRef: string): Promise<string> {
  // Direct file path or directory (mlx model)
  const resolved = resolve(modelRef);
  if (existsSync(resolved)) return resolved;

  // Try alias
  const aliases = await loadModelAliases();
  const aliasPath = aliases[modelRef];
  if (aliasPath) {
    const aliasResolved = resolve(aliasPath);
    if (existsSync(aliasResolved)) return aliasResolved;
    throw new Error(
      `Model alias '${modelRef}' points to '${aliasPath}' which does not exist`,
    );
  }

  throw new Error(
    `Model not found: '${modelRef}'. Provide a valid file path or configure an alias in ~/.config/whatcanirun/models.toml`,
  );
}

export async function computeSha256(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const hasher = createHash("sha256");
  const stream = file.stream();

  for await (const chunk of stream) {
    hasher.update(chunk);
  }

  return hasher.digest("hex");
}

export async function inspectModel(modelPath: string): Promise<ModelInfo> {
  const name = basename(modelPath);
  const format = inferFormat(modelPath);
  const quant = inferQuant(name);

  let sha256 = "";
  try {
    const stat = statSync(modelPath);
    if (stat.isFile()) {
      sha256 = await computeSha256(modelPath);
    } else {
      // For directories, hash the config file if it exists
      const configPath = resolve(modelPath, "config.json");
      if (existsSync(configPath)) {
        sha256 = await computeSha256(configPath);
      }
    }
  } catch {}

  return {
    display_name: name,
    path: modelPath,
    format,
    quant,
    artifact_sha256: sha256,
  };
}
