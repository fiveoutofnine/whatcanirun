import { type NextRequest, NextResponse } from 'next/server';

import { and, count, countDistinct, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { devices, models, runs, RunStatus, trials } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_DEVICE_LENGTH = 500;

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const deviceChipId = request.nextUrl.searchParams.get('device')?.trim();
  if (!deviceChipId) {
    return NextResponse.json(
      { error: 'Missing required `device` query parameter.' },
      { status: 400 },
    );
  }
  if (deviceChipId.length > MAX_DEVICE_LENGTH) {
    return NextResponse.json({ error: '`device` query parameter is too long.' }, { status: 400 });
  }

  const rows = await db
    .select({
      artifactSha256: models.artifactSha256,
      source: models.source,
      filename: models.displayName,
      quant: models.quant,
      fileSizeBytes: models.fileSizeBytes,
      runtimeName: runs.runtimeName,
      contextLength: runs.contextLength,
      runtimeVersions: sql<
        string[]
      >`ARRAY_AGG(DISTINCT ${runs.runtimeVersion} ORDER BY ${runs.runtimeVersion})`.as(
        'runtime_versions',
      ),
      runCount: countDistinct(runs.id).as('run_count'),
      trialCount: count(trials.id).as('trial_count'),
      avgDecodeTps: sql<number>`AVG(${trials.decodeTps})`.as('avg_decode_tps'),
      avgPrefillTps: sql<number>`AVG(${trials.prefillTps})`.as('avg_prefill_tps'),
      avgPeakRssMb: sql<number>`AVG(${trials.peakRssMb})`.as('avg_peak_rss_mb'),
    })
    .from(trials)
    .innerJoin(runs, eq(trials.runId, runs.id))
    .innerJoin(models, eq(runs.modelId, models.id))
    .innerJoin(devices, eq(runs.deviceId, devices.id))
    .where(
      and(
        eq(runs.status, RunStatus.VERIFIED),
        eq(devices.chipId, deviceChipId),
        eq(models.format, 'gguf'),
        eq(runs.runtimeName, 'llama.cpp'),
        eq(trials.inputTokens, 4096),
        eq(trials.outputTokens, 1024),
      ),
    )
    .groupBy(
      models.artifactSha256,
      models.source,
      models.displayName,
      models.quant,
      models.fileSizeBytes,
      runs.runtimeName,
      runs.contextLength,
    );

  const response = NextResponse.json({
    schema_version: '1',
    device: deviceChipId,
    rows: rows.map((row) => {
      const colonIndex = row.source?.indexOf(':') ?? -1;
      const repoId = colonIndex >= 0 ? row.source!.slice(0, colonIndex) : row.source;
      const sourceFilename = colonIndex >= 0 ? row.source!.slice(colonIndex + 1) : null;

      return {
        artifact_sha256: row.artifactSha256,
        repo_id: repoId,
        filename: sourceFilename || row.filename,
        quant: row.quant,
        file_size_bytes: row.fileSizeBytes,
        runtime_name: row.runtimeName,
        runtime_versions: row.runtimeVersions,
        context_length: row.contextLength ?? 5120,
        kv_cache_type_k: null,
        kv_cache_type_v: null,
        run_count: Number(row.runCount),
        trial_count: Number(row.trialCount),
        avg_decode_tps: Number(row.avgDecodeTps),
        avg_prefill_tps: Number(row.avgPrefillTps),
        avg_peak_rss_mb: Number(row.avgPeakRssMb),
      };
    }),
  });
  response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return response;
}
