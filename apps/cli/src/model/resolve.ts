import { APP_DIR_NAME } from '@whatcanirun/shared';
import chalk from 'chalk';
import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { basename, extname, join, resolve } from 'path';
import { pipeline } from 'stream/promises';

import * as log from '../utils/log';
import { readGgufMetadata } from './gguf';

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
  /\b(q8_k_xl)\b/i,
  /\b(q8_k)\b/i,
  /\b(fp16)\b/i,
  /\b(fp32)\b/i,
  /\b(bf16)\b/i,
  /\b(f16)\b/i,
  /\b(f32)\b/i,
  /\b(awq)\b/i,
  /\b(gptq)\b/i,
  /\b(bnb)\b/i,
  /\b(exl2)\b/i,
  /\b(hqq)\b/i,
  /\b(aqlm)\b/i,
  // IQ (imatrix) GGUF quants (e.g. IQ2_XS, IQ3_XXS, IQ4_NL)
  /\b(iq[1-4]_(?:xxs|xs|[sml]|nl))\b/i,
  // MLX microscaling formats (e.g. MXFP4, MXFP4-Q8, MXINT8)
  /\b(mx(?:fp|int)\d+[-_]q\d+)\b/i,
  /\b(mx(?:fp|int)\d+)\b/i,
  // Bare quant levels (e.g. Q4, Q8) — checked last as a fallback
  /[-_](q\d+)\b/i,
];

const MLX_BIT_PATTERNS = [/(\d+)[\s-]*bit/i];

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export function inferQuant(name: string): string | null {
  // Try GGUF-style quant patterns first.
  for (const pattern of QUANT_PATTERNS) {
    const match = name.match(pattern);
    if (match) return match[1]!.toLowerCase();
  }
  // Try MLX-style bit patterns (e.g. "4bit", "8bit").
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

  // Check if it's an MLX directory.
  const configPath = resolve(modelPath, 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.model_type) return 'mlx';
    } catch (e: unknown) {
      log.warn(
        `Could not parse ${log.filepath(configPath)}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return 'unknown';
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a string looks like a Hugging Face repo ID (e.g.
 * "mlx-community/Qwen3.5-0.8B-4bit").
 */
export function isHuggingFaceRepoId(ref: string): boolean {
  return (
    /^[\w.-]+\/[\w.-]+$/.test(ref) &&
    !ref.startsWith('/') &&
    !ref.startsWith('.') &&
    !ref.startsWith('~')
  );
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

  // Return the most recently modified snapshot.
  return snapshots
    .map((d) => ({ name: d, mtime: statSync(join(snapshotsDir, d)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((d) => join(snapshotsDir, d.name))[0]!;
}

/**
 * Fetch expected total file size for an HF repo via the API.
 */
export async function getHfRepoSize(repoId: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`https://huggingface.co/api/models/${repoId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { usedStorage?: number };
    return data.usedStorage && data.usedStorage > 0 ? data.usedStorage : null;
  } catch {
    return null;
  }
}

/**
 * Sum the size of all blobs (including .incomplete) in the HF cache for a repo.
 */
export function getHfCacheBlobSize(repoId: string): number {
  const [org, name] = repoId.split('/');
  const blobsDir = join(
    homedir(),
    '.cache',
    'huggingface',
    'hub',
    `models--${org}--${name}`,
    'blobs'
  );
  if (!existsSync(blobsDir)) return 0;
  let total = 0;
  try {
    for (const f of readdirSync(blobsDir)) {
      try {
        total += statSync(join(blobsDir, f)).size;
      } catch {}
    }
  } catch {}
  return total;
}

/**
 * Check if a string is a HF repo ID with a specific file
 * (e.g. "unsloth/Qwen3.5-4B-GGUF:Qwen3.5-4B-Q4_K_M.gguf").
 */
export function isHuggingFaceFileRef(ref: string): boolean {
  const colonIdx = ref.indexOf(':');
  if (colonIdx < 0) return false;
  const repoId = ref.slice(0, colonIdx);
  const fileName = ref.slice(colonIdx + 1);
  return isHuggingFaceRepoId(repoId) && fileName.length > 0;
}

export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes: number | null;
}

const MODELS_CACHE_DIR = join(homedir(), APP_DIR_NAME, 'models');

/**
 * Download a specific file from a HF repo via HTTPS.
 * Caches to ~/.whatcanirun/models/{org}/{repo}/{fileName}.
 * Returns the local path immediately if already cached.
 */
async function downloadHfFile(
  repoId: string,
  fileName: string,
  opts?: { onProgress?: (progress: DownloadProgress) => void; signal?: AbortSignal }
): Promise<string> {
  const [org, repo] = repoId.split('/');
  const destDir = join(MODELS_CACHE_DIR, org!, repo!);
  const destPath = join(destDir, fileName);

  if (existsSync(destPath)) return destPath;

  const url = `https://huggingface.co/${repoId}/resolve/main/${fileName}`;
  const resp = await fetch(url, { redirect: 'follow', signal: opts?.signal });

  if (!resp.ok) {
    throw new Error(`Failed to download ${repoId}/${fileName}: HTTP ${resp.status}`);
  }

  const { mkdirSync, createWriteStream, renameSync, unlinkSync } = await import('fs');
  const { Readable, Transform } = await import('stream');
  mkdirSync(destDir, { recursive: true });

  const totalBytes = resp.headers.get('content-length')
    ? parseInt(resp.headers.get('content-length')!, 10)
    : null;
  let downloadedBytes = 0;

  // Write to a temp file first to avoid caching partial downloads.
  const tmpPath = `${destPath}.tmp`;
  const writer = createWriteStream(tmpPath);
  const body = resp.body;
  if (!body) throw new Error(`Empty response body for ${repoId}/${fileName}`);

  const progress = new Transform({
    transform(chunk, _encoding, callback) {
      downloadedBytes += chunk.length;
      opts?.onProgress?.({ downloadedBytes, totalBytes });
      callback(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(body as ReadableStream<Uint8Array>), progress, writer, {
      signal: opts?.signal,
    });
    renameSync(tmpPath, destPath);
  } catch (e) {
    // Clean up partial temp file on failure.
    try {
      unlinkSync(tmpPath);
    } catch {}
    throw e;
  }

  return destPath;
}

export interface ResolveModelOpts {
  runtime?: string;
  onDownloadProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Resolve a model reference to a path that the runtime can use.
 *
 * Inputs:
 *   - Local file/dir path       → returned as-is if it exists
 *   - "org/repo:file.gguf"      → downloads the specific file, returns local path
 *   - "org/repo" (HF repo ID)   → returned as-is (mlx_lm handles its own download)
 *
 * When `runtime` is provided, validates that the model format is compatible:
 *   - llama.cpp requires a local .gguf file or a "repo:file" ref (not a bare repo ID)
 *   - mlx_lm accepts bare repo IDs (it handles download internally)
 */
export async function resolveModel(modelRef: string, opts?: ResolveModelOpts): Promise<string> {
  // Direct file path or directory (mlx model dir or gguf file).
  const resolved = resolve(modelRef);
  if (existsSync(resolved)) return resolved;

  // HF repo with specific file (e.g. "org/repo:file.gguf") — download the file.
  if (isHuggingFaceFileRef(modelRef)) {
    const colonIdx = modelRef.indexOf(':');
    const repoId = modelRef.slice(0, colonIdx);
    const fileName = modelRef.slice(colonIdx + 1);
    return downloadHfFile(repoId, fileName, {
      onProgress: opts?.onDownloadProgress,
      signal: opts?.signal,
    });
  }

  // Hugging Face repo ID — validate against runtime, then return as-is.
  if (isHuggingFaceRepoId(modelRef)) {
    if (opts?.runtime === 'llama.cpp') {
      throw new Error(
        `${chalk.cyan('llama.cpp')} requires a file path or Hugging Face ${chalk.italic('file reference')}: '${chalk.cyan('{org}/{repo}:{file}.gguf')}'.`
      );
    }
    return modelRef;
  }

  throw new Error(
    `Model '${chalk.cyan(modelRef)}' not found. Provide a file path or Hugging Face repo ID.`
  );
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

/**
 * Extract quantization info from an MLX model's config.json.
 * Reads top-level `bits` and `mode` from the `quantization` or
 * `quantization_config` object, ignoring per-layer overrides.
 */
export function inferQuantFromMlxConfig(config: Record<string, unknown>): string | null {
  const qConfig = (config.quantization ?? config.quantization_config) as
    | Record<string, unknown>
    | undefined;
  if (!qConfig || typeof qConfig !== 'object') return null;

  const bits = qConfig.bits as number | undefined;
  const mode = qConfig.mode as string | undefined;
  if (bits == null) return null;

  // "affine" is the default MLX quant mode — not meaningful to display.
  // Distinctive modes like "mxfp4" are used as the quant label.
  if (mode && mode.toLowerCase() !== 'affine') return mode.toLowerCase();
  return `${bits}bit`;
}

/**
 * Read parameter count from `model.safetensors.index.json` metadata,
 * falling back to `config.json` `num_parameters`.
 */
function readParameters(dirPath: string, config?: Record<string, unknown>): string | null {
  // Try safetensors index first (most reliable).
  try {
    const indexPath = join(dirPath, 'model.safetensors.index.json');
    if (existsSync(indexPath)) {
      const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
      const raw = index?.metadata?.total_parameters;
      const totalParams = typeof raw === 'string' ? Number(raw) : raw;
      if (typeof totalParams === 'number' && totalParams > 0) {
        return formatParamCount(totalParams);
      }
    }
  } catch {}

  // Fall back to config.json num_parameters.
  if (config) {
    const n = config.num_parameters as number | undefined;
    if (typeof n === 'number' && n > 0) return formatParamCount(n);
  }

  return null;
}

/**
 * Cheap, name-only model info. No file I/O — safe to call before
 * the model is downloaded or cached.
 */
export function inferModelFromName(modelRef: string): ModelInfo {
  const isHfFile = isHuggingFaceFileRef(modelRef);
  const isHfRepo = isHfFile || isHuggingFaceRepoId(modelRef);

  let name: string;
  let source: string | undefined;
  let format: string;

  if (isHfFile) {
    const colonIdx = modelRef.indexOf(':');
    const fileName = modelRef.slice(colonIdx + 1);
    source = modelRef.slice(0, colonIdx);
    name = fileName;
    format = inferFormat(fileName);
  } else if (isHfRepo) {
    name = modelRef.split('/')[1]!;
    source = modelRef;
    format = 'mlx';
  } else {
    name = basename(modelRef);
    format = inferFormat(resolve(modelRef));
  }

  return {
    display_name: name,
    path: modelRef,
    format,
    quant: inferQuant(isHfRepo ? modelRef : name),
    artifact_sha256: '',
    source,
  };
}

/**
 * Full model inspection. Reads config.json, GGUF headers,
 * safetensors metadata, and computes SHA256. Requires the model
 * files to be present on disk (downloaded / cached).
 */
export async function inspectModel(modelRef: string): Promise<ModelInfo> {
  const base = inferModelFromName(modelRef);
  const isHfRepo = isHuggingFaceRepoId(modelRef);

  let { quant } = base;
  let sha256 = '';
  let fileSizeBytes: number | undefined;
  let parameters: string | undefined;
  let architecture: string | undefined;

  if (isHfRepo) {
    const cachePath = findHfCachePath(modelRef);
    if (cachePath) {
      sha256 = await computeDirSha256(cachePath);
      fileSizeBytes = sumShardSizes(cachePath);

      try {
        const configPath = join(cachePath, 'config.json');
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          architecture =
            config.model_type || config.architectures?.[0] || config.text_config?.model_type;
          parameters = readParameters(cachePath, config) ?? undefined;
          quant = inferQuantFromMlxConfig(config) ?? quant;
        }
      } catch (e: unknown) {
        log.warn(`Could not read model config: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } else {
    const resolved = resolve(modelRef);

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
      log.warn(`Could not compute model hash/size: ${e instanceof Error ? e.message : String(e)}`);
    }

    // GGUF: read metadata from binary header.
    if (base.format === 'gguf') {
      try {
        const meta = await readGgufMetadata(resolved);
        if (meta) {
          if (meta.architecture) architecture = meta.architecture;
          if (meta.quant) quant = meta.quant;
          if (meta.sizeLabel) parameters = meta.sizeLabel;
        }
      } catch (e: unknown) {
        log.warn(`Could not read GGUF metadata: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Try to read architecture and parameters from `config.json`.
    if (!architecture || !parameters) {
      try {
        const stat = statSync(resolved);
        const dirPath = stat.isDirectory() ? resolved : resolve(resolved, '..');
        const configPath = join(dirPath, 'config.json');
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          if (!architecture) {
            architecture =
              config.model_type || config.architectures?.[0] || config.text_config?.model_type;
          }
          if (!parameters) {
            parameters = readParameters(dirPath, config) ?? undefined;
          }
          if (base.format === 'mlx') {
            quant = inferQuantFromMlxConfig(config) ?? quant;
          }
        }
      } catch (e: unknown) {
        log.warn(`Could not read model config: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return {
    ...base,
    quant,
    artifact_sha256: sha256,
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
