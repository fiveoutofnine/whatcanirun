import { APP_DIR_NAME } from '@whatcanirun/shared';
import chalk from 'chalk';
import { randomBytes } from 'crypto';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const DEFAULT_BUNDLES_DIR = join(homedir(), APP_DIR_NAME, 'bundles');

const RUNTIME_SLUGS: Record<string, string> = {
  mlx_lm: 'mlx',
  'llama.cpp': 'llamacpp',
};

// -----------------------------------------------------------------------------
// Slugification
// -----------------------------------------------------------------------------

export function slugifyRuntime(name: string): string {
  return RUNTIME_SLUGS[name] ?? name.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function slugifyModel(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
}

// -----------------------------------------------------------------------------
// Bundle ID & Filename
// -----------------------------------------------------------------------------

export function generateBundleId(opts: { runtime: string; model: string }): string {
  const rt = slugifyRuntime(opts.runtime);
  const model = slugifyModel(opts.model);
  const hex = randomBytes(3).toString('hex');
  return `${rt}-${model}-${hex}`;
}

export function bundleFilename(bundleId: string): string {
  return `${bundleId}.zip`;
}

// -----------------------------------------------------------------------------
// Bundle Path Resolution
// -----------------------------------------------------------------------------

export function resolveBundlePath(bundleArg: string): string {
  // Direct path
  if (existsSync(bundleArg)) return bundleArg;

  // Exact ID match
  const exact = join(DEFAULT_BUNDLES_DIR, `${bundleArg}.zip`);
  if (existsSync(exact)) return exact;

  // Substring match in bundles dir
  if (existsSync(DEFAULT_BUNDLES_DIR)) {
    const files = readdirSync(DEFAULT_BUNDLES_DIR).filter((f) => f.endsWith('.zip'));
    const matches = files.filter((f) => f.replace(/\.zip$/, '').includes(bundleArg));

    if (matches.length === 1) {
      return join(DEFAULT_BUNDLES_DIR, matches[0]!);
    }
    if (matches.length > 1) {
      const names = matches.map((m) => chalk.cyan(m.replace(/\.zip$/, ''))).join(', ');
      throw new Error(`Multiple bundles match "${chalk.cyan(bundleArg)}": ${names}.`);
    }
  }

  throw new Error(`Bundle ${chalk.cyan(bundleArg)} not found.`);
}
