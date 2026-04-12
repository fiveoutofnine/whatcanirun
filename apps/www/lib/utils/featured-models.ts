import type {
  FeaturedDeviceInfo,
  FeaturedDeviceType,
  FeaturedDeviceTarget,
  FeaturedModel,
  FeaturedRuntime,
  FeaturedWishlistEntry,
} from '@whatcanirun/shared';
import {
  FEATURED_WISHLIST,
  getFeaturedDeviceType,
  isFeaturedRuntime,
  normalizeFeaturedDeviceTarget,
  toFeaturedModel,
} from '@whatcanirun/shared';

import { getVramGb } from '@/lib/constants/gpu';

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

interface FeaturedModelSizeRow {
  fileSizeBytes: number | null;
  modelRef: string | null;
}

interface SelectFeaturedWishlistEntriesOptions {
  coverage: ReadonlyMap<string, number>;
  coverageByType: ReadonlyMap<string, number>;
  deviceTarget?: FeaturedDeviceTarget | null;
  limit?: number | null;
  runtime?: FeaturedRuntime;
  wishlist?: readonly FeaturedWishlistEntry[];
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_FEATURED_LIMIT = 50;
const FEATURED_MEMORY_OVERHEAD_BYTES = 512 * 1024 * 1024;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function clampFeaturedLimit(limit?: number | null): number | undefined {
  if (limit == null || Number.isNaN(limit)) return undefined;
  return Math.max(1, Math.min(MAX_FEATURED_LIMIT, Math.trunc(limit)));
}

function getFeaturedGpuBudgetBytes(
  query: FeaturedModelsQuery,
  deviceTarget: FeaturedDeviceTarget | null,
): number | null {
  if (!deviceTarget || getFeaturedDeviceType(deviceTarget) !== 'gpu' || !query.gpu?.trim()) {
    return null;
  }

  const vramGb = getVramGb(query.gpu);
  if (vramGb == null) return null;

  const gpuCount =
    query.gpuCount != null && Number.isFinite(query.gpuCount) && query.gpuCount > 0
      ? Math.trunc(query.gpuCount)
      : 1;

  return vramGb * gpuCount * 1024 * 1024 * 1024;
}

function buildFeaturedModelFileSizeMap(
  rows: readonly FeaturedModelSizeRow[],
): Map<string, number> {
  const fileSizes = new Map<string, number>();

  for (const row of rows) {
    if (!row.modelRef || row.fileSizeBytes == null || row.fileSizeBytes <= 0) continue;

    const existing = fileSizes.get(row.modelRef);
    if (existing == null || row.fileSizeBytes < existing) {
      fileSizes.set(row.modelRef, row.fileSizeBytes);
    }
  }

  return fileSizes;
}

function filterFeaturedWishlistByGpuBudget(
  wishlist: readonly FeaturedWishlistEntry[],
  fileSizes: ReadonlyMap<string, number>,
  gpuBudgetBytes: number | null,
): FeaturedWishlistEntry[] {
  if (gpuBudgetBytes == null) return [...wishlist];

  return wishlist.filter((entry) => {
    const fileSizeBytes = fileSizes.get(entry.modelRef);
    if (fileSizeBytes == null) return true;

    return fileSizeBytes + FEATURED_MEMORY_OVERHEAD_BYTES <= gpuBudgetBytes;
  });
}

export function getFeaturedCoverageKey(
  runtime: FeaturedRuntime,
  modelRef: string,
  target: FeaturedDeviceTarget,
): string {
  return `${runtime}::${modelRef}::${target}`;
}

export function getFeaturedCoverageTypeKey(
  runtime: FeaturedRuntime,
  modelRef: string,
  deviceType: FeaturedDeviceType,
): string {
  return `${runtime}::${modelRef}::${deviceType}`;
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

export function buildFeaturedCoverageByTypeMap(
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

    const key = getFeaturedCoverageTypeKey(
      row.runtime,
      row.modelRef,
      getFeaturedDeviceType(deviceTarget),
    );
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
  coverageByType: ReadonlyMap<string, number>,
): number {
  if (entry.deviceTypes.length === 0) return 0;

  let minimum = Number.POSITIVE_INFINITY;
  for (const deviceType of entry.deviceTypes) {
    const key = getFeaturedCoverageTypeKey(entry.runtime, entry.modelRef, deviceType);
    minimum = Math.min(minimum, coverageByType.get(key) ?? 0);
  }

  return Number.isFinite(minimum) ? minimum : 0;
}

export function selectFeaturedWishlistEntries(
  options: SelectFeaturedWishlistEntriesOptions,
): FeaturedWishlistEntry[] {
  const wishlist = options.wishlist ?? FEATURED_WISHLIST;
  const coverage = options.coverage;
  const coverageByType = options.coverageByType;
  const deviceTarget = options.deviceTarget ?? null;
  const deviceType = deviceTarget ? getFeaturedDeviceType(deviceTarget) : null;
  const limit = clampFeaturedLimit(options.limit);
  const runtimeEntries = options.runtime
    ? wishlist.filter((entry) => entry.runtime === options.runtime)
    : [...wishlist];
  const targetedEntries =
    deviceType == null
      ? []
      : runtimeEntries.filter((entry) => entry.deviceTypes.includes(deviceType));
  const useTargetedEntries = deviceTarget != null && targetedEntries.length > 0;
  const entries = useTargetedEntries ? targetedEntries : runtimeEntries;

  const scoredEntries = entries.map((entry) => ({
    entry,
    score:
      useTargetedEntries && deviceTarget
        ? getFeaturedEntryCoverage(entry, deviceTarget, coverage)
        : getMinimumFeaturedEntryCoverage(entry, coverageByType),
    index: wishlist.indexOf(entry),
  }));

  scoredEntries.sort((left, right) => left.score - right.score || left.index - right.index);

  return scoredEntries
    .slice(0, limit ?? scoredEntries.length)
    .map(({ entry }) => entry);
}

async function getHistoricalFeaturedCoverageRows(
  wishlist: readonly FeaturedWishlistEntry[],
  runtime?: FeaturedRuntime,
): Promise<HistoricalFeaturedCoverageRow[]> {
  const candidateModelRefs = [...new Set(wishlist.map((entry) => entry.modelRef))];

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

async function getFeaturedModelSizeRows(
  wishlist: readonly FeaturedWishlistEntry[],
): Promise<FeaturedModelSizeRow[]> {
  const candidateModelRefs = [...new Set(wishlist.map((entry) => entry.modelRef))];

  if (candidateModelRefs.length === 0) return [];

  const [{ inArray, sql }, { db }, { models, modelsInfo }] = await Promise.all([
    import('drizzle-orm'),
    import('@/lib/db'),
    import('@/lib/db/schema'),
  ]);

  const modelSourceExpression =
    sql<string | null>`COALESCE(NULLIF(${modelsInfo.source}, ''), ${models.source})`;
  const fileSizeExpression =
    sql<number | null>`COALESCE(NULLIF(${modelsInfo.fileSizeBytes}, 0), ${models.fileSizeBytes})`;

  return db
    .select({
      modelRef: modelSourceExpression.as('model_ref'),
      fileSizeBytes: fileSizeExpression.as('file_size_bytes'),
    })
    .from(models)
    .leftJoin(modelsInfo, sql`${models.artifactSha256} = ${modelsInfo.artifactSha256}`)
    .where(inArray(modelSourceExpression, candidateModelRefs));
}

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

export async function getFeaturedModels(query: FeaturedModelsQuery = {}): Promise<FeaturedModel[]> {
  const runtime = query.runtime && isFeaturedRuntime(query.runtime) ? query.runtime : undefined;
  const deviceTarget = normalizeFeaturedDeviceTarget(query);
  const runtimeWishlist = runtime
    ? FEATURED_WISHLIST.filter((entry) => entry.runtime === runtime)
    : FEATURED_WISHLIST;
  const gpuBudgetBytes = getFeaturedGpuBudgetBytes(query, deviceTarget);
  const fileSizes = buildFeaturedModelFileSizeMap(await getFeaturedModelSizeRows(runtimeWishlist));
  const wishlist = filterFeaturedWishlistByGpuBudget(runtimeWishlist, fileSizes, gpuBudgetBytes);
  const rows = await getHistoricalFeaturedCoverageRows(wishlist, runtime);
  const coverage = buildFeaturedCoverageMap(rows);
  const coverageByType = buildFeaturedCoverageByTypeMap(rows);
  const entries = selectFeaturedWishlistEntries({
    coverage,
    coverageByType,
    deviceTarget,
    limit: query.limit,
    runtime,
    wishlist,
  });

  return entries.map(toFeaturedModel);
}
