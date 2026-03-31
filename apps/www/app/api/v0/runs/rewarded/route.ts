import { NextResponse } from 'next/server';

import type { Manifest, Results } from '@whatcanirun/shared';
import { validateManifest, validateResults } from '@whatcanirun/shared';
import { and, eq, sql } from 'drizzle-orm';
import { Mppx, tempo } from 'mppx/nextjs';
import { unzipSync } from 'fflate';

import { db } from '@/lib/db';
import { devices, models, runs, RunStatus, trials } from '@/lib/db/schema';
import { sha256 } from '@/lib/utils';
import { validatePlausibility } from '@/lib/validators/bundle';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_ZIP_BYTES = 5 * 1024;
const MAX_UNZIPPED_BYTES = 50 * 1024;
const MAX_TEXT_LENGTH = 1_000;

const TEMPO_CHAIN_ID = 42431;

// -----------------------------------------------------------------------------
// MPPX setup
// -----------------------------------------------------------------------------

const isTestnet = process.env.NODE_ENV !== 'production';

const mppx = Mppx.create({
  methods: [
    tempo.charge({
      ...(!isTestnet && {
        currency: '0x20C000000000000000000000b9537d11c60E8b50', // USDC.e on Tempo
      }),
      recipient: '0x8831C0C0CCB2E45c187A4e3fA92D683c52170407',
      testnet: isTestnet,
    }),
  ],
});

// -----------------------------------------------------------------------------
// POST — MPPX-gated run upload (reward granted on verification)
// -----------------------------------------------------------------------------

export const POST = mppx.charge({ amount: '0.00' })(async (request: Request) => {
  const formData = await request.formData();
  const bundleFile = formData.get('bundle');
  if (!(bundleFile instanceof File)) {
    return NextResponse.json({ error: 'Missing bundle zip file.' }, { status: 400 });
  }

  // Wallet address is required for reward identity.
  const walletAddress = formData.get('wallet_address') as string | null;
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: 'Missing or invalid wallet_address (expected 0x-prefixed 40-hex-char address).' },
      { status: 400 },
    );
  }

  const did = `did:pkh:eip155:${TEMPO_CHAIN_ID}:${walletAddress}`;

  // --- Unzip & validate (mirrors /api/v0/runs) ---

  const zipBuffer = new Uint8Array(await bundleFile.arrayBuffer());
  if (zipBuffer.byteLength > MAX_ZIP_BYTES) {
    return NextResponse.json(
      { error: `Bundle too large: ${zipBuffer.byteLength} bytes exceeds ${MAX_ZIP_BYTES} byte limit.` },
      { status: 413 },
    );
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zipBuffer);
  } catch {
    return NextResponse.json({ error: 'Invalid zip file.' }, { status: 400 });
  }

  const totalUnzippedBytes = Object.values(files).reduce((sum, buf) => sum + buf.byteLength, 0);
  if (totalUnzippedBytes > MAX_UNZIPPED_BYTES) {
    return NextResponse.json(
      { error: `Decompressed bundle too large: ${totalUnzippedBytes} bytes exceeds ${MAX_UNZIPPED_BYTES} byte limit.` },
      { status: 413 },
    );
  }

  // Manifest
  const manifestBytes = files['manifest.json'];
  if (!manifestBytes) {
    return NextResponse.json({ error: 'Missing `manifest.json` in bundle.' }, { status: 400 });
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    return NextResponse.json({ error: 'Invalid `manifest.json`.' }, { status: 400 });
  }

  const manifestErrors = validateManifest(manifest);
  if (manifestErrors.length > 0) {
    return NextResponse.json({ error: 'Invalid manifest', details: manifestErrors }, { status: 400 });
  }

  // Results
  const resultsBytes = files['results.json'];
  if (!resultsBytes) {
    return NextResponse.json({ error: 'Missing `results.json` in bundle.' }, { status: 400 });
  }

  let results: Results;
  try {
    results = JSON.parse(new TextDecoder().decode(resultsBytes));
  } catch {
    return NextResponse.json({ error: 'Invalid `results.json`.' }, { status: 400 });
  }

  const resultsErrors = validateResults(results);
  if (resultsErrors.length > 0) {
    return NextResponse.json({ error: 'Invalid results', details: resultsErrors }, { status: 400 });
  }

  // Plausibility
  const aggregate = results.aggregate;
  const plausibilityErrors = validatePlausibility(aggregate);
  if (plausibilityErrors.length > 0) {
    return NextResponse.json(
      { error: 'Plausibility check failed', details: plausibilityErrors },
      { status: 422 },
    );
  }

  // Dedup
  const bundleSha256 = await sha256(zipBuffer);
  const [existing] = await db
    .select({ id: runs.id })
    .from(runs)
    .where(eq(runs.bundleSha256, bundleSha256))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: 'Duplicate bundle: a run with this content hash already exists', run_id: existing.id },
      { status: 409 },
    );
  }

  // --- Upsert device ---

  const dev = manifest.device;
  const devCpu = truncate(dev.cpu)!;
  const devCpuCores = dev.cpu_cores ?? 0;
  const devGpu = truncate(dev.gpu)!;
  const devGpuCores = dev.gpu_cores ?? 0;
  const devOsName = truncate(dev.os_name)!;
  const devOsVersion = truncate(dev.os_version)!;
  const devChipId = `${devCpu}:${devCpuCores}:${devGpu}:${devGpuCores}:${dev.ram_gb}`;

  await db
    .insert(devices)
    .values({
      cpu: devCpu,
      cpuCores: devCpuCores,
      gpu: devGpu,
      gpuCores: devGpuCores,
      ramGb: dev.ram_gb,
      chipId: devChipId,
      osName: devOsName,
      osVersion: devOsVersion,
    })
    .onConflictDoNothing();

  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(
      and(
        eq(devices.cpu, devCpu),
        eq(devices.cpuCores, devCpuCores),
        eq(devices.gpu, devGpu),
        eq(devices.gpuCores, devGpuCores),
        eq(devices.ramGb, dev.ram_gb),
        eq(devices.osName, devOsName),
        eq(devices.osVersion, devOsVersion),
      ),
    )
    .limit(1);

  if (!device) {
    return NextResponse.json({ error: 'Failed to resolve device.' }, { status: 500 });
  }

  // --- Upsert model ---

  const mod = manifest.model;
  const modDisplayName = truncate(mod.display_name)!;
  const modFormat = truncate(mod.format)!;
  const modSource = truncate(mod.source) ?? null;
  const modParameters = truncate(mod.parameters) ?? null;
  const modQuant = truncate(mod.quant) ?? null;
  const modArchitecture = truncate(mod.architecture) ?? null;

  const [model] = await db
    .insert(models)
    .values({
      displayName: modDisplayName,
      format: modFormat,
      artifactSha256: mod.artifact_sha256,
      source: modSource,
      fileSizeBytes: mod.file_size_bytes,
      parameters: modParameters,
      quant: modQuant,
      architecture: modArchitecture,
    })
    .onConflictDoUpdate({
      target: models.artifactSha256,
      set: {
        displayName: modDisplayName,
        format: modFormat,
        source: sql`COALESCE(${modSource}, ${models.source})`,
        fileSizeBytes: sql`COALESCE(${mod.file_size_bytes ?? null}, ${models.fileSizeBytes})`,
        parameters: sql`COALESCE(${modParameters}, ${models.parameters})`,
        quant: sql`COALESCE(${modQuant}, ${models.quant})`,
        architecture: sql`COALESCE(${modArchitecture}, ${models.architecture})`,
      },
    })
    .returning({ id: models.id });

  if (!model) {
    return NextResponse.json({ error: 'Failed to resolve model.' }, { status: 500 });
  }

  // --- Insert run + trials (DID stored on the run for reward on verification) ---

  const promptTokens = results.trials.reduce((sum, t) => sum + (t.input_tokens ?? 0), 0);
  const completionTokens = results.trials.reduce((sum, t) => sum + (t.output_tokens ?? 0), 0);

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const ipHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const ipHash = Array.from(new Uint8Array(ipHashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const [run] = await db
    .insert(runs)
    .values({
      bundleId: manifest.bundle_id,
      schemaVersion: manifest.schema_version,
      status: RunStatus.PENDING,
      notes: truncate(manifest.notes, 5000),
      userId: null,
      did,
      deviceId: device.id,
      modelId: model.id,
      bundleSha256,
      runtimeName: truncate(manifest.runtime.name)!,
      runtimeVersion: truncate(manifest.runtime.version)!,
      runtimeBuildFlags: truncate(manifest.runtime.build_flags),
      harnessVersion: truncate(manifest.harness.version)!,
      harnessGitSha: truncate(manifest.harness.git_sha)!,
      contextLength: manifest.context_length,
      promptTokens,
      completionTokens,
      ipHash,
      ttftP50Ms: aggregate.ttft_p50_ms,
      ttftP95Ms: aggregate.ttft_p95_ms,
      decodeTpsMean: aggregate.decode_tps_mean,
      prefillTpsMean: aggregate.prefill_tps_mean,
      idleRssMb: aggregate.idle_rss_mb,
      peakRssMb: aggregate.peak_rss_mb,
      trialsPassed: aggregate.trials_passed,
      trialsTotal: aggregate.trials_total,
    })
    .returning({ id: runs.id });

  if (!run) {
    return NextResponse.json({ error: 'Failed to insert run.' }, { status: 500 });
  }

  if (results.trials.length > 0) {
    await db.insert(trials).values(
      results.trials.map((t, i) => ({
        runId: run.id,
        trialIndex: i,
        inputTokens: t.input_tokens,
        outputTokens: t.output_tokens,
        ttftMs: t.ttft_ms,
        totalMs: t.total_ms,
        prefillTps: t.prefill_tps ?? 0,
        decodeTps: t.decode_tps,
        idleRssMb: t.idle_rss_mb ?? 0,
        peakRssMb: t.peak_rss_mb,
      })),
    );
  }

  return NextResponse.json(
    {
      run_id: run.id,
      did,
      status: RunStatus.PENDING,
      run_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://whatcani.run'}/run/${run.id}`,
      reward: 'pending — reward is granted when the run is verified',
    },
    { status: 201 },
  );
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function truncate(
  value: string | undefined | null,
  max = MAX_TEXT_LENGTH,
): string | undefined | null {
  if (value == null) return value;
  return value.length > max ? value.slice(0, max) : value;
}
