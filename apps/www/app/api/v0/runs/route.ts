import { NextRequest, NextResponse } from 'next/server';

import { and, asc, count, desc, eq, SQL } from 'drizzle-orm';
import { unzipSync } from 'fflate';

import { db } from '@/lib/db';
import { apiTokens, devices, models, runs, RunStatus, ScenarioId } from '@/lib/db/schema';
import { sha256 } from '@/lib/utils';
import {
  AggregateMetrics,
  validateManifest,
  validatePlausibility,
  validateResults,
} from '@/lib/validators/bundle';

// -----------------------------------------------------------------------------
// POST /api/v0/runs — submit a benchmark bundle
// -----------------------------------------------------------------------------

interface ManifestDevice {
  cpu: string;
  gpu: string;
  ram_gb: number;
  os_name: string;
  os_version: string;
}

interface ManifestRuntime {
  name: string;
  version: string;
  build_flags?: string;
}

interface ManifestModel {
  display_name: string;
  format: string;
  artifact_sha256: string;
  tokenizer_sha256?: string;
  source?: string;
  file_size_bytes?: number;
  parameters?: string;
  quant?: string;
  architecture?: string;
}

interface ManifestData {
  schema_version: string;
  bundle_id: string;
  task: string;
  scenario_id: string;
  canonical: boolean;
  harness: { version: string; git_sha: string };
  device: ManifestDevice;
  runtime: ManifestRuntime;
  model: ManifestModel;
  quant: { name: string | null };
  context_length?: number;
  notes?: string;
}

interface ResultsData {
  trials: unknown[];
  aggregate: AggregateMetrics;
}

export async function POST(request: NextRequest) {
  // 0. Authenticate via bearer token
  let userId: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const raw = authHeader.slice(7);
    const tokenHash = await sha256(raw);
    const [apiToken] = await db
      .select({ userId: apiTokens.userId, id: apiTokens.id })
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, tokenHash))
      .limit(1);

    if (apiToken) {
      userId = apiToken.userId;
      // Update last-used timestamp (fire-and-forget).
      db.update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokens.id, apiToken.id))
        .then(() => {});
    }
  }

  // 1. Parse multipart form
  const formData = await request.formData();
  const bundleFile = formData.get('bundle');
  if (!(bundleFile instanceof File)) {
    return NextResponse.json({ error: 'Missing bundle zip file' }, { status: 400 });
  }

  // 2. Unzip in memory
  const zipBuffer = new Uint8Array(await bundleFile.arrayBuffer());
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zipBuffer);
  } catch {
    return NextResponse.json({ error: 'Invalid zip file' }, { status: 400 });
  }

  // 3. Extract and validate manifest.json
  const manifestBytes = files['manifest.json'];
  if (!manifestBytes) {
    return NextResponse.json({ error: 'Missing manifest.json in bundle' }, { status: 400 });
  }

  let manifest: ManifestData;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    return NextResponse.json({ error: 'Invalid manifest.json' }, { status: 400 });
  }

  const manifestErrors = validateManifest(manifest);
  if (manifestErrors.length > 0) {
    return NextResponse.json(
      { error: 'Invalid manifest', details: manifestErrors },
      { status: 400 },
    );
  }

  // 4. Extract and validate results.json
  const resultsBytes = files['results.json'];
  if (!resultsBytes) {
    return NextResponse.json({ error: 'Missing results.json in bundle' }, { status: 400 });
  }

  let results: ResultsData;
  try {
    results = JSON.parse(new TextDecoder().decode(resultsBytes));
  } catch {
    return NextResponse.json({ error: 'Invalid results.json' }, { status: 400 });
  }

  const resultsErrors = validateResults(results);
  if (resultsErrors.length > 0) {
    return NextResponse.json({ error: 'Invalid results', details: resultsErrors }, { status: 400 });
  }

  // 5. Plausibility checks
  const aggregate = results.aggregate;
  const plausibilityErrors = validatePlausibility(aggregate);
  if (plausibilityErrors.length > 0) {
    return NextResponse.json(
      { error: 'Plausibility check failed', details: plausibilityErrors },
      { status: 422 },
    );
  }

  // 6. Deduplicate by bundle content hash
  const bundleSha256 = formData.get('bundle_sha256') as string | null;
  if (!bundleSha256) {
    return NextResponse.json({ error: 'Missing bundle_sha256' }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: runs.id })
    .from(runs)
    .where(eq(runs.bundleSha256, bundleSha256))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      {
        error: 'Duplicate bundle: a run with this content hash already exists',
        run_id: existing.id,
      },
      { status: 409 },
    );
  }

  // 7. Upsert device
  const dev = manifest.device;
  await db
    .insert(devices)
    .values({
      cpu: dev.cpu,
      gpu: dev.gpu,
      ramGb: dev.ram_gb,
      osName: dev.os_name,
      osVersion: dev.os_version,
    })
    .onConflictDoNothing();

  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(
      and(
        eq(devices.cpu, dev.cpu),
        eq(devices.gpu, dev.gpu),
        eq(devices.ramGb, dev.ram_gb),
        eq(devices.osName, dev.os_name),
        eq(devices.osVersion, dev.os_version),
      ),
    )
    .limit(1);

  // 8. Upsert model (update metadata on conflict with same artifact)
  const mod = manifest.model;
  const [model] = await db
    .insert(models)
    .values({
      displayName: mod.display_name,
      format: mod.format,
      artifactSha256: mod.artifact_sha256,
      tokenizerSha256: mod.tokenizer_sha256,
      source: mod.source,
      fileSizeBytes: mod.file_size_bytes,
      parameters: mod.parameters,
      quant: mod.quant,
      architecture: mod.architecture,
    })
    .onConflictDoUpdate({
      target: models.artifactSha256,
      set: {
        displayName: mod.display_name,
        format: mod.format,
        tokenizerSha256: mod.tokenizer_sha256,
        source: mod.source,
        fileSizeBytes: mod.file_size_bytes,
        parameters: mod.parameters,
        quant: mod.quant,
        architecture: mod.architecture,
      },
    })
    .returning({ id: models.id });

  // 9. Compute aggregated token counts from trials
  const trials = results.trials as Array<{ input_tokens?: number; output_tokens?: number }>;
  const promptTokens = trials.reduce((sum, t) => sum + (t.input_tokens ?? 0), 0);
  const completionTokens = trials.reduce((sum, t) => sum + (t.output_tokens ?? 0), 0);

  // 10. Hash client IP for rate-limiting / spam detection
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const ipHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const ipHash = Array.from(new Uint8Array(ipHashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 11. Insert run
  const [run] = await db
    .insert(runs)
    .values({
      bundleId: manifest.bundle_id,
      schemaVersion: manifest.schema_version,
      status: RunStatus.VERIFIED,
      scenarioId: manifest.scenario_id as ScenarioId,
      task: manifest.task,
      canonical: manifest.canonical,
      notes: manifest.notes,
      userId,
      deviceId: device!.id,
      modelId: model!.id,
      bundleSha256,
      runtimeName: manifest.runtime.name,
      runtimeVersion: manifest.runtime.version,
      runtimeBuildFlags: manifest.runtime.build_flags,
      harnessVersion: manifest.harness.version,
      harnessGitSha: manifest.harness.git_sha,
      contextLength: manifest.context_length,
      promptTokens,
      completionTokens,
      ipHash,
      ttftP50Ms: aggregate.ttft_p50_ms,
      ttftP95Ms: aggregate.ttft_p95_ms,
      decodeTpsMean: aggregate.decode_tps_mean,
      weightedTpsMean: aggregate.weighted_tps_mean,
      idleRssMb: aggregate.idle_rss_mb,
      peakRssMb: aggregate.peak_rss_mb,
      trialsPassed: aggregate.trials_passed,
      trialsTotal: aggregate.trials_total,
      trials: results.trials,
    })
    .returning({ id: runs.id });

  return NextResponse.json(
    {
      run_id: run!.id,
      status: RunStatus.VERIFIED,
      run_url: `/runs/${run!.id}`,
    },
    { status: 201 },
  );
}

// -----------------------------------------------------------------------------
// GET /api/v0/runs — list runs
// -----------------------------------------------------------------------------

const SORT_COLUMNS = {
  decode_tps_mean: runs.decodeTpsMean,
  ttft_p50_ms: runs.ttftP50Ms,
  weighted_tps_mean: runs.weightedTpsMean,
  created_at: runs.createdAt,
} as const;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const modelId = params.get('model_id');
  const deviceId = params.get('device_id');
  const scenarioId = params.get('scenario_id');
  const runtimeName = params.get('runtime_name');
  const status = params.get('status') || RunStatus.VERIFIED;
  const sortKey = (params.get('sort') || 'decode_tps_mean') as keyof typeof SORT_COLUMNS;
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const limit = Math.min(parseInt(params.get('limit') || '50', 10), 100);
  const offset = parseInt(params.get('offset') || '0', 10);

  const conditions: SQL[] = [];
  if (modelId) conditions.push(eq(runs.modelId, modelId));
  if (deviceId) conditions.push(eq(runs.deviceId, deviceId));
  if (scenarioId) conditions.push(eq(runs.scenarioId, scenarioId as ScenarioId));
  if (runtimeName) conditions.push(eq(runs.runtimeName, runtimeName));
  if (status) conditions.push(eq(runs.status, status as RunStatus));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const sortCol = SORT_COLUMNS[sortKey] || runs.decodeTpsMean;
  const orderFn = order === 'asc' ? asc : desc;

  const [runRows, [totalRow]] = await Promise.all([
    db
      .select({
        id: runs.id,
        bundleId: runs.bundleId,
        schemaVersion: runs.schemaVersion,
        status: runs.status,
        scenarioId: runs.scenarioId,
        task: runs.task,
        canonical: runs.canonical,
        notes: runs.notes,
        deviceId: runs.deviceId,
        modelId: runs.modelId,
        userId: runs.userId,
        runtimeName: runs.runtimeName,
        runtimeVersion: runs.runtimeVersion,
        runtimeBuildFlags: runs.runtimeBuildFlags,
        harnessVersion: runs.harnessVersion,
        harnessGitSha: runs.harnessGitSha,
        contextLength: runs.contextLength,
        promptTokens: runs.promptTokens,
        completionTokens: runs.completionTokens,
        ttftP50Ms: runs.ttftP50Ms,
        ttftP95Ms: runs.ttftP95Ms,
        decodeTpsMean: runs.decodeTpsMean,
        weightedTpsMean: runs.weightedTpsMean,
        idleRssMb: runs.idleRssMb,
        peakRssMb: runs.peakRssMb,
        trialsPassed: runs.trialsPassed,
        trialsTotal: runs.trialsTotal,
        bundleUrl: runs.bundleUrl,
        createdAt: runs.createdAt,
        updatedAt: runs.updatedAt,
      })
      .from(runs)
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(runs).where(where),
  ]);

  return NextResponse.json({ runs: runRows, total: totalRow!.count });
}
