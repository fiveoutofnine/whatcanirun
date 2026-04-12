import type {
  FeaturedDeviceInfo,
  FeaturedDeviceTarget,
  FeaturedModel,
  FeaturedRuntime,
  FeaturedWishlistEntry,
} from '@whatcanirun/shared';
import {
  FEATURED_WISHLIST,
  isFeaturedRuntime,
  normalizeFeaturedDeviceTarget,
  toFeaturedModel,
} from '@whatcanirun/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FeaturedModelsQuery extends FeaturedDeviceInfo {
  runtime?: FeaturedRuntime;
  limit?: number | null;
}

export interface HistoricalFeaturedCoverageRow {
  runtime: string;
  modelRef: string | null;
  cpu: string;
  gpu: string;
  gpuCount: number;
  osName: string;
  runCount: number;
}

interface SelectFeaturedWishlistEntriesOptions {
  coverage: ReadonlyMap<string, number>;
  deviceTarget?: FeaturedDeviceTarget | null;
  limit?: number | null;
  runtime?: FeaturedRuntime;
  wishlist?: readonly FeaturedWishlistEntry[];
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_FEATURED_LIMIT = 50;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function clampFeaturedLimit(limit?: number | null): number | undefined {
  if (limit == null || Number.isNaN(limit)) return undefined;
  return Math.max(1, Math.min(MAX_FEATURED_LIMIT, Math.trunc(limit)));
}

export function getFeaturedCoverageKey(
  runtime: FeaturedRuntime,
  modelRef: string,
  target: FeaturedDeviceTarget,
): string {
  return `${runtime}::${modelRef}::${target}`;
}

export function buildFeaturedCoverageMap(
  rows: readonly HistoricalFeaturedCoverageRow[],
): Map<string, number> {
  const coverage = new Map<string, number>();

  for (const row of rows) {
    if (!isFeaturedRuntime(row.runtime) || !row.modelRef) continue;

    const deviceTarget = normalizeFeaturedDeviceTarget({
      cpu: row.cpu,
      gpu: row.gpu,
      gpuCount: row.gpuCount,
      osName: row.osName,
    });

    if (!deviceTarget) continue;

    const key = getFeaturedCoverageKey(row.runtime, row.modelRef, deviceTarget);
    coverage.set(key, (coverage.get(key) ?? 0) + Number(row.runCount));
  }

  return coverage;
}

function getFeaturedEntryCoverage(
  entry: FeaturedWishlistEntry,
  target: FeaturedDeviceTarget,
  coverage: ReadonlyMap<string, number>,
): number {
  return coverage.get(getFeaturedCoverageKey(entry.runtime, entry.modelRef, target)) ?? 0;
}

function getMinimumFeaturedEntryCoverage(
  entry: FeaturedWishlistEntry,
  coverage: ReadonlyMap<string, number>,
): number {
  if (entry.targets.length === 0) return 0;

  let minimum = Number.POSITIVE_INFINITY;
  for (const target of entry.targets) {
    minimum = Math.min(minimum, getFeaturedEntryCoverage(entry, target, coverage));
  }

  return Number.isFinite(minimum) ? minimum : 0;
}

export function selectFeaturedWishlistEntries(
  options: SelectFeaturedWishlistEntriesOptions,
): FeaturedWishlistEntry[] {
  const wishlist = options.wishlist ?? FEATURED_WISHLIST;
  const coverage = options.coverage;
  const deviceTarget = options.deviceTarget ?? null;
  const limit = clampFeaturedLimit(options.limit);
  const runtimeEntries = options.runtime
    ? wishlist.filter((entry) => entry.runtime === options.runtime)
    : [...wishlist];
  const targetedEntries =
    deviceTarget == null ? [] : runtimeEntries.filter((entry) => entry.targets.includes(deviceTarget));
  const useTargetedEntries = deviceTarget != null && targetedEntries.length > 0;
  const entries = useTargetedEntries ? targetedEntries : runtimeEntries;

  const scoredEntries = entries.map((entry) => ({
    entry,
    score:
      useTargetedEntries && deviceTarget
        ? getFeaturedEntryCoverage(entry, deviceTarget, coverage)
        : getMinimumFeaturedEntryCoverage(entry, coverage),
    index: wishlist.indexOf(entry),
  }));

  scoredEntries.sort((left, right) => left.score - right.score || left.index - right.index);

  return scoredEntries
    .slice(0, limit ?? scoredEntries.length)
    .map(({ entry }) => entry);
}

async function getHistoricalFeaturedCoverageRows(
  runtime?: FeaturedRuntime,
): Promise<HistoricalFeaturedCoverageRow[]> {
  const candidateEntries = runtime
    ? FEATURED_WISHLIST.filter((entry) => entry.runtime === runtime)
    : FEATURED_WISHLIST;
  const candidateModelRefs = [...new Set(candidateEntries.map((entry) => entry.modelRef))];

  if (candidateModelRefs.length === 0) return [];

  const [
    { and, count, eq, inArray, sql },
    { db },
    { devices, models, modelsInfo, runs, RunStatus },
  ] = await Promise.all([import('drizzle-orm'), import('@/lib/db'), import('@/lib/db/schema')]);

  const modelSourceExpression =
    sql<string | null>`COALESCE(NULLIF(${modelsInfo.source}, ''), ${models.source})`;
  const whereConditions = [
    eq(runs.status, RunStatus.VERIFIED),
    inArray(modelSourceExpression, candidateModelRefs),
  ];

  if (runtime) {
    whereConditions.push(eq(runs.runtimeName, runtime));
  }

  return db
    .select({
      runtime: runs.runtimeName,
      modelRef: modelSourceExpression.as('model_ref'),
      cpu: devices.cpu,
      gpu: devices.gpu,
      gpuCount: devices.gpuCount,
      osName: devices.osName,
      runCount: count(runs.id).as('run_count'),
    })
    .from(runs)
    .innerJoin(models, eq(runs.modelId, models.id))
    .leftJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
    .innerJoin(devices, eq(runs.deviceId, devices.id))
    .where(and(...whereConditions))
    .groupBy(
      runs.runtimeName,
      models.source,
      modelsInfo.source,
      devices.cpu,
      devices.gpu,
      devices.gpuCount,
      devices.osName,
    );
}

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

export async function getFeaturedModels(query: FeaturedModelsQuery = {}): Promise<FeaturedModel[]> {
  const runtime = query.runtime && isFeaturedRuntime(query.runtime) ? query.runtime : undefined;
  const deviceTarget = normalizeFeaturedDeviceTarget(query);
  const coverage = buildFeaturedCoverageMap(await getHistoricalFeaturedCoverageRows(runtime));
  const entries = selectFeaturedWishlistEntries({
    coverage,
    deviceTarget,
    limit: query.limit,
    runtime,
  });

  return entries.map(toFeaturedModel);
}
