import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

import type { DeviceInfo } from '../device/detect';
import { formatSysinfo } from '../device/detect';
import type { ModelInfo } from '../model/resolve';
import type { BenchResult, RuntimeInfo } from '../runtime/types';
import { bundleFilename, generateBundleId } from '../utils/id';
import type { AggregateMetrics, Manifest, Results, ResultTrial } from './schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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
  scenarioId: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Function
// -----------------------------------------------------------------------------

export async function createBundle(opts: BundleOpts): Promise<string> {
  const bundleId = generateBundleId({
    runtime: opts.runtimeInfo.name,
    model: opts.model.display_name,
  });
  const now = new Date();
  const filename = bundleFilename(bundleId);

  if (!existsSync(opts.outputDir)) {
    mkdirSync(opts.outputDir, { recursive: true });
  }

  const manifest: Manifest = {
    schema_version: '0.1.0',
    bundle_id: bundleId,
    created_at: now.toISOString(),
    task: 'llm.generate.v1',
    scenario_id: opts.scenarioId,
    canonical: false,
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
    context_length: opts.bench.promptTokens + opts.bench.completionTokens,
    notes: opts.notes,
  };

  const trials: ResultTrial[] = opts.bench.trials.map((t) => ({
    input_tokens: opts.bench.promptTokens,
    output_tokens: opts.bench.completionTokens,
    ttft_ms: t.promptTps > 0 ? (opts.bench.promptTokens / t.promptTps) * 1000 : 0,
    total_ms: 0,
    decode_tps: t.generationTps,
    weighted_tps:
      opts.bench.promptTokens + opts.bench.completionTokens > 0
        ? (opts.bench.promptTokens * t.promptTps + opts.bench.completionTokens * t.generationTps) /
          (opts.bench.promptTokens + opts.bench.completionTokens)
        : 0,
    peak_rss_mb: Math.round(t.peakMemoryGb * 1024 * 10) / 10,
    exit_status: 'ok',
  }));

  const aggregate: AggregateMetrics = {
    ttft_p50_ms: opts.metrics.ttftP50Ms,
    ttft_p95_ms: opts.metrics.ttftP95Ms,
    decode_tps_mean: opts.metrics.decodeTpsMean,
    weighted_tps_mean: opts.metrics.weightedTpsMean,
    idle_rss_mb: 0,
    peak_rss_mb: opts.metrics.peakRssMb,
    trials_passed: opts.bench.trials.length,
    trials_total: opts.bench.trials.length,
  };

  const results: Results = { trials, aggregate };

  const sysinfo = formatSysinfo(opts.device);

  // Create a temporary directory for bundle contents.
  const tmpDir = join(opts.outputDir, `.tmp_${bundleId}`);
  mkdirSync(tmpDir, { recursive: true });

  // Write files with deterministic formatting.
  await Bun.write(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await Bun.write(join(tmpDir, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  await Bun.write(join(tmpDir, 'sysinfo.txt'), sysinfo + '\n');

  // Create deterministic zip using system zip command.
  const outputPath = resolve(opts.outputDir, filename);
  const zipProc = Bun.spawn(
    ['zip', '-rX', outputPath, 'manifest.json', 'results.json', 'sysinfo.txt'],
    {
      cwd: tmpDir,
      stdout: 'ignore',
      stderr: 'pipe',
    }
  );
  const zipCode = await zipProc.exited;
  if (zipCode !== 0) {
    const stderr = await new Response(zipProc.stderr).text();
    throw new Error(`Failed to create bundle zip: ${stderr.trim() || `exit code ${zipCode}`}`);
  }

  // Clean up temp dir.
  const rmProc = Bun.spawn(['rm', '-rf', tmpDir], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
  await rmProc.exited;

  return outputPath;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

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
