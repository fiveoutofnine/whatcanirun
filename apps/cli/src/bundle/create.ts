import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

import type { DeviceInfo } from '../device/detect';
import { formatSysinfo } from '../device/detect';
import type { ModelInfo } from '../model/resolve';
import type { BenchResult, RuntimeInfo } from '../runtime/types';
import { bundleFilename, formatTimestamp, generateBundleId } from '../utils/id';
import type { Manifest, Results } from './schema';

export interface DerivedMetrics {
  ttftP50Ms: number;
  ttftP95Ms: number;
  decodeTpsMean: number;
  weightedTpsMean: number;
  peakRssMb: number;
}

export interface BundleOpts {
  outputDir: string;
  device: DeviceInfo;
  runtimeInfo: RuntimeInfo;
  model: ModelInfo;
  bench: BenchResult;
  metrics: DerivedMetrics;
  notes?: string;
}

export async function createBundle(opts: BundleOpts): Promise<string> {
  const bundleId = generateBundleId();
  const now = new Date();
  const timestamp = formatTimestamp(now);
  const filename = bundleFilename(timestamp, bundleId);

  if (!existsSync(opts.outputDir)) {
    mkdirSync(opts.outputDir, { recursive: true });
  }

  const manifest: Manifest = {
    schema_version: '1.0.0',
    bundle_id: bundleId,
    created_at: now.toISOString(),
    harness: {
      version: '0.1.0',
      git_sha: await getGitSha(),
    },
    device: {
      cpu: opts.device.cpu_model,
      gpu: opts.device.gpu_model,
      ram_gb: opts.device.ram_gb,
      os_name: opts.device.os_name,
      os_version: opts.device.os_version,
    },
    runtime: {
      name: opts.runtimeInfo.name,
      version: opts.runtimeInfo.version,
      build_flags: opts.runtimeInfo.build_flags,
    },
    model: {
      display_name: opts.model.display_name,
      format: opts.model.format,
      artifact_sha256: opts.model.artifact_sha256,
      source: opts.model.source,
      file_size_bytes: opts.model.file_size_bytes,
      parameters: opts.model.parameters,
      quant: opts.model.quant ?? undefined,
      architecture: opts.model.architecture,
    },
    bench: {
      promptTokens: opts.bench.promptTokens,
      completionTokens: opts.bench.completionTokens,
      trialsTotal: opts.bench.trials.length,
      trialsPassed: opts.bench.trials.length,
      averages: opts.bench.averages,
    },
    metrics: opts.metrics,
    notes: opts.notes,
  };

  const results: Results = {
    trials: opts.bench.trials,
    averages: opts.bench.averages,
  };

  const sysinfo = formatSysinfo(opts.device);

  // Create a temporary directory for bundle contents
  const tmpDir = join(opts.outputDir, `.tmp_${bundleId}`);
  mkdirSync(tmpDir, { recursive: true });

  // Write files with deterministic formatting
  await Bun.write(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await Bun.write(join(tmpDir, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  await Bun.write(join(tmpDir, 'sysinfo.txt'), sysinfo + '\n');

  // Create deterministic zip using system zip command
  const outputPath = resolve(opts.outputDir, filename);
  const zipProc = Bun.spawn(
    ['zip', '-rX', outputPath, 'manifest.json', 'results.json', 'sysinfo.txt'],
    {
      cwd: tmpDir,
      stdout: 'ignore',
      stderr: 'ignore',
    }
  );
  await zipProc.exited;

  // Clean up temp dir
  const rmProc = Bun.spawn(['rm', '-rf', tmpDir], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
  await rmProc.exited;

  return outputPath;
}

async function getGitSha(): Promise<string> {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', '--short', 'HEAD'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const sha = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    return sha || 'unknown';
  } catch {
    return 'unknown';
  }
}
