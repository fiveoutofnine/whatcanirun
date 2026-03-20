/**
 * Shared version utilities for runtime adapters.
 *
 * Each runtime has a minimum supported version below which the output format
 * is not guaranteed to match our parsers. These constants and helpers enforce
 * version requirements at detect() time and provide clear upgrade messages.
 */

// ---------------------------------------------------------------------------
// Minimum supported versions
// ---------------------------------------------------------------------------

/**
 * Minimum llama.cpp build number.
 * `-o json` with `samples_ts` has been present since at least b3600.
 * We require b4000 to provide margin for other fixes/stabilizations.
 */
export const LLAMA_CPP_MIN_BUILD = 4000;

/**
 * Minimum mlx_lm version (semver).
 * The benchmark subcommand (`mlx_lm.benchmark`) was introduced in v0.27.0
 * (PR #396, August 2025). The output format (`Trial N: prompt_tps=...,
 * generation_tps=..., peak_memory=...`) has been stable since that release.
 * Earlier versions do not have the benchmark module at all.
 */
export const MLX_LM_MIN_VERSION = '0.27.0';

// ---------------------------------------------------------------------------
// Version parsing and comparison
// ---------------------------------------------------------------------------

/**
 * Extract the numeric build number from a llama.cpp version string.
 * Accepts formats like "b8240", "8240", or the raw `--version` output.
 * Returns null if no numeric build can be extracted.
 */
export function parseLlamaCppBuild(version: string): number | null {
  const match = version.match(/\b(\d{3,})\b/);
  if (!match) return null;
  const num = parseInt(match[1]!, 10);
  return isNaN(num) ? null : num;
}

/**
 * Compare two semver-like version strings (e.g. "0.19.0", "0.30.1").
 * Pre-release versions (e.g. "0.19.0.dev0", "0.19.0rc1") are considered
 * less than their release counterpart ("0.19.0.dev0" < "0.19.0").
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareSemver(a: string, b: string): number {
  const preReleasePattern = /[-.]?(dev|alpha|beta|rc)\d*$/i;

  const parse = (v: string) => {
    const isPreRelease = preReleasePattern.test(v);
    const parts = v
      .replace(/[-+].+$/, '') // strip pre-release/build metadata after - or +
      .replace(/[^0-9.]/g, '') // strip non-numeric except dots
      .split('.')
      .filter((s) => s !== '')
      .map((s) => parseInt(s, 10) || 0);
    return { parts, isPreRelease };
  };

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.parts.length, pb.parts.length);

  for (let i = 0; i < len; i++) {
    const va = pa.parts[i] ?? 0;
    const vb = pb.parts[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }

  // Numeric parts are equal — pre-release is less than release.
  if (pa.isPreRelease && !pb.isPreRelease) return -1;
  if (!pa.isPreRelease && pb.isPreRelease) return 1;
  return 0;
}

/** Returns true if `version` is at least `minimum`. */
export function isVersionAtLeast(version: string, minimum: string): boolean {
  return compareSemver(version, minimum) >= 0;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

const UPGRADE_HINTS: Record<string, string> = {
  'llama.cpp': 'Upgrade with: brew upgrade llama.cpp',
  mlx_lm: 'Upgrade with: pip install --upgrade mlx-lm',
};

export class UnsupportedVersionError extends Error {
  runtime: string;
  detected: string;
  minimum: string;

  constructor(runtime: string, detected: string, minimum: string) {
    const hint = UPGRADE_HINTS[runtime] ?? '';
    super(
      `Unsupported ${runtime} version: ${detected}. Minimum required: ${minimum}.` +
        (hint ? `\n${hint}` : '')
    );
    this.name = 'UnsupportedVersionError';
    this.runtime = runtime;
    this.detected = detected;
    this.minimum = minimum;
  }
}
