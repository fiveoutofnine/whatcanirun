import { validateManifest, validateResults } from '@whatcanirun/shared';
import chalk from 'chalk';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// -----------------------------------------------------------------------------
// Function
// -----------------------------------------------------------------------------

export async function validateBundle(bundlePath: string): Promise<ValidationResult> {
  const errors: string[] = [];

  // Extract to temp directory.
  const tmpDir = mkdtempSync(join(tmpdir(), 'whatcanirun-validate-'));

  try {
    const proc = Bun.spawn(['unzip', '-o', bundlePath, '-d', tmpDir], {
      stdout: 'ignore',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    if (code !== 0) {
      const stderr = await new Response(proc.stderr).text();
      errors.push(`Failed to extract bundle: ${stderr.trim()}.`);
      return { valid: false, errors };
    }

    // Check required files.
    const requiredFiles = ['manifest.json', 'results.json', 'sysinfo.txt'];

    for (const file of requiredFiles) {
      const f = Bun.file(join(tmpDir, file));
      if (!(await f.exists())) {
        errors.push(`Missing required file ${chalk.cyan(file)}.`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Validate manifest.
    let manifest: unknown;
    try {
      manifest = JSON.parse(await Bun.file(join(tmpDir, 'manifest.json')).text());
    } catch (e: unknown) {
      errors.push(
        `Invalid ${chalk.cyan('manifest.json')}: ${e instanceof Error ? e.message : String(e)}`
      );
      return { valid: false, errors };
    }
    errors.push(...validateManifest(manifest));

    // Validate results
    let results: unknown;
    try {
      results = JSON.parse(await Bun.file(join(tmpDir, 'results.json')).text());
    } catch (e: unknown) {
      errors.push(
        `Invalid ${chalk.cyan('results.json')}: ${e instanceof Error ? e.message : String(e)}`
      );
      return { valid: false, errors };
    }
    errors.push(...validateResults(results));

    // Check artifact hash presence.
    const m = manifest as Record<string, unknown>;
    const model = m.model as Record<string, unknown> | undefined;
    if (!model?.artifact_sha256) {
      errors.push(`Missing model ${chalk.cyan('artifact_sha256')}.`);
    }

    return { valid: errors.length === 0, errors };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
