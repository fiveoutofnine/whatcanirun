import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

import type { DeviceInfo } from '../device/detect.ts';
import { formatSysinfo } from '../device/detect.ts';
import type { AggregateMetrics } from '../metrics/aggregator.ts';
import type { TrialResult } from '../metrics/collector.ts';
import type { ModelInfo } from '../model/resolve.ts';
import type { RuntimeInfo } from '../runtime/types.ts';
import type { ScenarioDefinition } from '../scenarios/types.ts';
import { bundleFilename, formatTimestamp, generateBundleId } from '../utils/id.ts';
import type { Manifest, Results } from './schema.ts';

export interface BundleOpts {
  outputDir: string;
  device: DeviceInfo;
  runtimeName: string;
  runtimeInfo: RuntimeInfo;
  model: ModelInfo;
  scenario: ScenarioDefinition;
  trials: TrialResult[];
  aggregate: AggregateMetrics;
  canonical: boolean;
  harnessLog: string;
  runtimeLog: string;
  quant?: string | null;
  notes?: string;
  nonce?: string;
  runtimeFlags?: string;
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
    schema_version: 'v1',
    bundle_id: bundleId,
    created_at: now.toISOString(),
    task: 'llm.generate.v1',
    scenario_id: opts.scenario.id,
    canonical: opts.canonical,
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
      name: opts.runtimeName,
      version: opts.runtimeInfo.version,
      build_flags: opts.runtimeInfo.build_flags,
    },
    model: {
      display_name: opts.model.display_name,
      format: opts.model.format,
      artifact_sha256: opts.model.artifact_sha256,
      file_size_bytes: opts.model.file_size_bytes,
      parameters: opts.model.parameters,
      quant: opts.model.quant ?? undefined,
      architecture: opts.model.architecture,
    },
    quant: {
      name: opts.quant ?? opts.model.quant,
    },
    notes: opts.notes,
    nonce: opts.nonce,
  };

  const results: Results = {
    trials: opts.trials,
    aggregate: opts.aggregate,
  };

  const sysinfo = formatSysinfo(opts.device);

  // Create a temporary directory for bundle contents
  const tmpDir = join(opts.outputDir, `.tmp_${bundleId}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(join(tmpDir, 'logs'), { recursive: true });

  // Write files with deterministic formatting
  await Bun.write(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await Bun.write(join(tmpDir, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  await Bun.write(join(tmpDir, 'sysinfo.txt'), sysinfo + '\n');
  await Bun.write(join(tmpDir, 'logs', 'harness.log'), opts.harnessLog);
  await Bun.write(join(tmpDir, 'logs', 'runtime.log'), opts.runtimeLog);

  // Create deterministic zip using system zip command
  // -rX: recurse + no extra attributes for determinism
  const outputPath = resolve(opts.outputDir, filename);
  const zipProc = Bun.spawn(
    ['zip', '-rX', outputPath, 'manifest.json', 'results.json', 'sysinfo.txt', 'logs/'],
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
