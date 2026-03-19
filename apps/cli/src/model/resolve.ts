import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { basename, extname, join, resolve } from 'path';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ModelInfo {
  display_name: string;
  path: string;
  format: string;
  quant: string | null;
  artifact_sha256: string;
  source?: string;
  file_size_bytes?: number;
  parameters?: string;
  architecture?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUANT_PATTERNS = [
  /\b(q2_k)\b/i,
  /\b(q3_k_[sml])\b/i,
  /\b(q4_0)\b/i,
  /\b(q4_1)\b/i,
  /\b(q4_k_[sml])\b/i,
  /\b(q4_k_xl)\b/i,
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

const MLX_BIT_PATTERNS = [/(\d+)[\s-]*bit/i];

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function inferQuant(name: string): string | null {
  // Try GGUF-style quant patterns first
  for (const pattern of QUANT_PATTERNS) {
    const match = name.match(pattern);
    if (match) return match[1]!.toLowerCase();
  }
  // Try MLX-style bit patterns (e.g. "4bit", "8bit")
  for (const pattern of MLX_BIT_PATTERNS) {
    const match = name.match(pattern);
    if (match) return `${match[1]}bit`;
  }
  return null;
}

export function inferFormat(modelPath: string): string {
  const ext = extname(modelPath).toLowerCase();
  if (ext === '.gguf') return 'gguf';
  if (ext === '.safetensors') return 'safetensors';
  if (ext === '.bin') return 'bin';
  if (ext === '.pt' || ext === '.pth') return 'pytorch';

  // Check if it's an mlx directory
  const configPath = resolve(modelPath, 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.model_type) return 'mlx';
    } catch (e: unknown) {
      console.warn(
        `Warning: could not parse ${configPath}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return 'unknown';
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a string looks like a HuggingFace repo ID (e.g. "mlx-community/Qwen3.5-0.8B-4bit").
 */
export function isHuggingFaceRepoId(ref: string): boolean {
  return /^[\w.-]+\/[\w.-]+$/.test(ref) && !ref.startsWith('/') && !ref.startsWith('.');
}

/**
 * Find the HF cache directory for a given repo ID.
 * Returns the latest snapshot path, or null if not cached.
 */
export function findHfCachePath(repoId: string): string | null {
  const [org, name] = repoId.split('/');
  const cacheDir = join(homedir(), '.cache', 'huggingface', 'hub', `models--${org}--${name}`);
  const snapshotsDir = join(cacheDir, 'snapshots');

  if (!existsSync(snapshotsDir)) return null;

  const snapshots = readdirSync(snapshotsDir).filter(
    (d) => !d.startsWith('.') && statSync(join(snapshotsDir, d)).isDirectory()
  );

  if (snapshots.length === 0) return null;

  // Return the most recently modified snapshot
  return snapshots
    .map((d) => ({ name: d, mtime: statSync(join(snapshotsDir, d)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((d) => join(snapshotsDir, d.name))[0]!;
}

export async function resolveModel(modelRef: string): Promise<string> {
  // Direct file path or directory (mlx model dir or gguf file)
  const resolved = resolve(modelRef);
  if (existsSync(resolved)) return resolved;

  // HuggingFace repo ID — return as-is (mlx_lm handles download)
  if (isHuggingFaceRepoId(modelRef)) return modelRef;

  // Try alias
  const aliases = await loadModelAliases();
  const aliasPath = aliases[modelRef];
  if (aliasPath) {
    const aliasResolved = resolve(aliasPath);
    if (existsSync(aliasResolved)) return aliasResolved;
    throw new Error(`Model alias '${modelRef}' points to '${aliasPath}' which does not exist`);
  }

  throw new Error(
    `Model not found: '${modelRef}'. Provide a file path, HuggingFace repo ID, or alias from ~/.config/whatcanirun/models.toml`
  );
}

async function loadModelAliases(): Promise<Record<string, string>> {
  const configPath = resolve(homedir(), '.config', 'whatcanirun', 'models.toml');
  if (!existsSync(configPath)) return {};

  try {
    const content = await Bun.file(configPath).text();
    const { parse } = await import('smol-toml');
    const config = parse(content);
    return (config.models as Record<string, string>) || {};
  } catch (e: unknown) {
    console.warn(
      `Warning: could not parse ~/.config/whatcanirun/models.toml: ${e instanceof Error ? e.message : String(e)}`
    );
    return {};
  }
}

export async function computeSha256(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const hasher = createHash('sha256');
  const stream = file.stream();

  for await (const chunk of stream) {
    hasher.update(chunk);
  }

  return hasher.digest('hex');
}

/**
 * Compute SHA256 for a directory of safetensors shards.
 * Hashes only the largest shard as a practical proxy.
 */
async function computeDirSha256(dirPath: string): Promise<string> {
  const files = readdirSync(dirPath).filter((f) => f.endsWith('.safetensors'));
  if (files.length === 0) {
    // Fall back to config.json
    const configPath = join(dirPath, 'config.json');
    if (existsSync(configPath)) return computeSha256(configPath);
    return '';
  }

  // Hash the largest shard
  const largest = files
    .map((f) => ({ name: f, size: statSync(join(dirPath, f)).size }))
    .sort((a, b) => b.size - a.size)[0]!;

  return computeSha256(join(dirPath, largest.name));
}

/**
 * Sum file sizes for all safetensors shards in a directory.
 */
function sumShardSizes(dirPath: string): number {
  return readdirSync(dirPath)
    .filter((f) => f.endsWith('.safetensors'))
    .reduce((sum, f) => sum + statSync(join(dirPath, f)).size, 0);
}

export async function inspectModel(modelRef: string): Promise<ModelInfo> {
  const isHfRepo = isHuggingFaceRepoId(modelRef);
  const name = isHfRepo ? modelRef.split('/')[1]! : basename(modelRef);

  let format: string;
  let quant: string | null;
  let sha256 = '';
  let fileSizeBytes: number | undefined;
  let parameters: string | undefined;
  let architecture: string | undefined;
  let source: string | undefined;

  if (isHfRepo) {
    format = 'mlx';
    quant = inferQuant(modelRef);
    source = modelRef;

    // Try to get metadata from HF cache
    const cachePath = findHfCachePath(modelRef);
    if (cachePath) {
      sha256 = await computeDirSha256(cachePath);
      fileSizeBytes = sumShardSizes(cachePath);

      try {
        const configPath = join(cachePath, 'config.json');
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          architecture = config.model_type || config.architectures?.[0];
          if (config.num_parameters) {
            parameters = formatParamCount(config.num_parameters);
          }
        }
      } catch (e: unknown) {
        console.warn(
          `Warning: could not read model config: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  } else {
    const resolved = resolve(modelRef);
    format = inferFormat(resolved);
    quant = inferQuant(name);

    try {
      const stat = statSync(resolved);
      if (stat.isFile()) {
        sha256 = await computeSha256(resolved);
        fileSizeBytes = stat.size;
      } else if (stat.isDirectory()) {
        sha256 = await computeDirSha256(resolved);
        fileSizeBytes = sumShardSizes(resolved);
      }
    } catch (e: unknown) {
      console.warn(
        `Warning: could not compute model hash/size: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    // Try to read architecture and parameters from config.json
    try {
      const stat = statSync(resolved);
      const configPath = stat.isDirectory()
        ? resolve(resolved, 'config.json')
        : resolve(resolved, '..', 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        architecture = config.model_type || config.architectures?.[0];
        if (config.num_parameters) {
          parameters = formatParamCount(config.num_parameters);
        }
      }
    } catch (e: unknown) {
      console.warn(
        `Warning: could not read model config: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return {
    display_name: name,
    path: modelRef,
    format,
    quant,
    artifact_sha256: sha256,
    source,
    file_size_bytes: fileSizeBytes,
    parameters,
    architecture,
  };
}

function formatParamCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return `${n}`;
}
