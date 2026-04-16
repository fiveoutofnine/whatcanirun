import type {
  FeaturedDeviceInfo,
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
  distinctTargets: ReadonlyMap<string, readonly FeaturedDeviceTarget[]>;
  deviceTarget?: FeaturedDeviceTarget | null;
  limit?: number | null;
  runtime?: FeaturedRuntime;
  wishlist?: readonly FeaturedWishlistEntry[];
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_FEATURED_LIMIT = 50;
export const FEATURED_MODELS_CACHE_REVALIDATE_SECONDS = 3600;
export const FEATURED_MODELS_CACHE_TAG = 'featured-models';
const FEATURED_REQUIRED_MEMORY_MULTIPLIER = 1.25;
const FEATURED_REPO_BREADTH_TARGET = 4;
const FEATURED_FOUR_BIT_QUANT_PATTERN =
  /(?:^|[-_(\s])(?:4-bit|4bit|dq4(?:plus)?|fp4|iq4(?:[_a-z0-9]+)?|mxfp4|nvfp4|q4(?:[_a-z0-9]+)?)(?:$|[-_)\s])/i;
const FEATURED_EIGHT_BIT_QUANT_PATTERN =
  /(?:^|[-_(\s])(?:8-bit|8bit|int8|q8(?:[_a-z0-9]+)?)(?:$|[-_)\s])/i;

type PreferredFeaturedQuantBucket = '4bit' | '8bit';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function clampFeaturedLimit(limit?: number | null): number | undefined {
  if (limit == null || Number.isNaN(limit)) return undefined;
  return Math.max(1, Math.min(MAX_FEATURED_LIMIT, Math.trunc(limit)));
}

function getFeaturedRamBudgetBytes(ramGb?: number | null): number | null {
  if (ramGb == null || !Number.isFinite(ramGb) || ramGb <= 0) {
    return null;
  }

  return Math.trunc(ramGb) * 1024 * 1024 * 1024;
}

function getFeaturedMemoryBudgetBytes(
  query: FeaturedModelsQuery,
  deviceTarget: FeaturedDeviceTarget | null,
): number | null {
  if (!deviceTarget) return null;

  const deviceType = getFeaturedDeviceType(deviceTarget);
  const ramBudgetBytes = getFeaturedRamBudgetBytes(query.ramGb);

  if (deviceType === 'apple' || deviceType === 'cpu') {
    return ramBudgetBytes;
  }

  if (deviceType !== 'gpu' || !query.gpu?.trim()) {
    return ramBudgetBytes;
  }

  const vramGb = getVramGb(query.gpu);
  if (vramGb == null) return ramBudgetBytes;

  const gpuCount =
    query.gpuCount != null && Number.isFinite(query.gpuCount) && query.gpuCount > 0
      ? Math.trunc(query.gpuCount)
      : 1;

  return vramGb * gpuCount * 1024 * 1024 * 1024;
}

function getCoveredTargetsForEntry(
  entry: FeaturedWishlistEntry,
  distinctTargets: ReadonlyMap<string, readonly FeaturedDeviceTarget[]>,
): readonly FeaturedDeviceTarget[] {
  return (
    distinctTargets.get(getFeaturedModelCoverageKey(entry.runtime, entry.modelRef)) ?? []
  ).filter((target) => entry.deviceTypes.includes(getFeaturedDeviceType(target)));
}

export function getFeaturedCoverageKey(
  runtime: FeaturedRuntime,
  modelRef: string,
  target: FeaturedDeviceTarget,
): string {
  return `${runtime}::${modelRef}::${target}`;
}

export function getFeaturedModelCoverageKey(
  runtime: FeaturedRuntime,
  modelRef: string,
): string {
  return `${runtime}::${modelRef}`;
}

function getPreferredFeaturedQuantBucket(
  entry: Pick<FeaturedWishlistEntry, 'displayName' | 'hfFileName' | 'hfRepoId'>,
): PreferredFeaturedQuantBucket | null {
  const candidate = `${entry.displayName} ${entry.hfFileName ?? ''} ${entry.hfRepoId}`;

  if (FEATURED_FOUR_BIT_QUANT_PATTERN.test(candidate)) return '4bit';
  if (FEATURED_EIGHT_BIT_QUANT_PATTERN.test(candidate)) return '8bit';

  return null;
}

export function getFeaturedModelsCacheKey(query: FeaturedModelsQuery = {}): string[] {
  const runtime = query.runtime && isFeaturedRuntime(query.runtime) ? query.runtime : undefined;
  const limit = clampFeaturedLimit(query.limit);
  const deviceTarget = normalizeFeaturedDeviceTarget(query);
  const memoryBudgetBytes = getFeaturedMemoryBudgetBytes(query, deviceTarget);

  return [
    FEATURED_MODELS_CACHE_TAG,
    runtime ?? 'all',
    deviceTarget ?? 'any',
    String(memoryBudgetBytes ?? ''),
    String(limit ?? ''),
  ];
}

function buildFeaturedCoverageIndex(
  rows: readonly HistoricalFeaturedCoverageRow[],
): {
  coverage: Map<string, number>;
  distinctTargets: Map<string, readonly FeaturedDeviceTarget[]>;
} {
  const coverage = new Map<string, number>();
  const distinctTargets = new Map<string, Set<FeaturedDeviceTarget>>();

  for (const row of rows) {
    if (!isFeaturedRuntime(row.runtime) || !row.modelRef) continue;

    const deviceTarget = normalizeFeaturedDeviceTarget({
      cpu: row.cpu,
      gpu: row.gpu,
      gpuCount: row.gpuCount,
      osName: row.osName,
    });

    if (!deviceTarget) continue;

    const coverageKey = getFeaturedCoverageKey(row.runtime, row.modelRef, deviceTarget);
    coverage.set(coverageKey, (coverage.get(coverageKey) ?? 0) + Number(row.runCount));

    const modelKey = getFeaturedModelCoverageKey(row.runtime, row.modelRef);
    let targets = distinctTargets.get(modelKey);

    if (!targets) {
      targets = new Set<FeaturedDeviceTarget>();
      distinctTargets.set(modelKey, targets);
    }

    targets.add(deviceTarget);
  }

  return {
    coverage,
    distinctTargets: new Map(
      [...distinctTargets.entries()].map(([key, targets]) => [key, Object.freeze([...targets])]),
    ),
  };
}

export function selectFeaturedWishlistEntries(
  options: SelectFeaturedWishlistEntriesOptions,
): FeaturedWishlistEntry[] {
  const wishlist = options.wishlist ?? FEATURED_WISHLIST;
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
  const coveredTargetsByModelKey = new Map<string, readonly FeaturedDeviceTarget[]>();
  const repoEntryCounts = new Map<string, number>();
  const coveredEntryCountsByRepo = new Map<string, number>();
  const coveredPreferredQuantBucketsByRepoAndTarget = new Map<
    string,
    Set<PreferredFeaturedQuantBucket>
  >();

  for (const entry of runtimeEntries) {
    const modelKey = getFeaturedModelCoverageKey(entry.runtime, entry.modelRef);
    const coveredTargets = getCoveredTargetsForEntry(entry, options.distinctTargets);
    coveredTargetsByModelKey.set(modelKey, coveredTargets);

    const repoKey = getFeaturedModelCoverageKey(entry.runtime, entry.hfRepoId);
    repoEntryCounts.set(repoKey, (repoEntryCounts.get(repoKey) ?? 0) + 1);
  }

  for (const entry of runtimeEntries) {
    const repoKey = getFeaturedModelCoverageKey(entry.runtime, entry.hfRepoId);
    if ((repoEntryCounts.get(repoKey) ?? 0) <= 1) continue;

    const modelKey = getFeaturedModelCoverageKey(entry.runtime, entry.modelRef);
    const coveredTargets = coveredTargetsByModelKey.get(modelKey) ?? [];
    if (coveredTargets.length === 0) continue;

    coveredEntryCountsByRepo.set(repoKey, (coveredEntryCountsByRepo.get(repoKey) ?? 0) + 1);
  }

  if (useTargetedEntries && deviceTarget) {
    for (const entry of targetedEntries) {
      const preferredQuantBucket = getPreferredFeaturedQuantBucket(entry);
      if (!preferredQuantBucket) continue;

      const exactCoverage =
        options.coverage.get(getFeaturedCoverageKey(entry.runtime, entry.modelRef, deviceTarget)) ??
        0;
      if (exactCoverage <= 0) continue;

      const repoTargetKey = getFeaturedCoverageKey(entry.runtime, entry.hfRepoId, deviceTarget);
      let coveredBuckets = coveredPreferredQuantBucketsByRepoAndTarget.get(repoTargetKey);

      if (!coveredBuckets) {
        coveredBuckets = new Set<PreferredFeaturedQuantBucket>();
        coveredPreferredQuantBucketsByRepoAndTarget.set(repoTargetKey, coveredBuckets);
      }

      coveredBuckets.add(preferredQuantBucket);
    }
  }

  const scoredEntries = entries.map((entry) => {
    const modelKey = getFeaturedModelCoverageKey(entry.runtime, entry.modelRef);
    const coveredTargets = coveredTargetsByModelKey.get(modelKey) ?? [];
    const repoKey = getFeaturedModelCoverageKey(entry.runtime, entry.hfRepoId);
    const repoEntryCount = repoEntryCounts.get(repoKey) ?? 0;
    const distinctCoveredEntriesForRepo =
      repoEntryCount > 1 ? (coveredEntryCountsByRepo.get(repoKey) ?? 0) : 0;

    let weakestTargetCoverage = 0;
    let underfilledTargetCount = 0;

    if (coveredTargets.length > 0) {
      weakestTargetCoverage = Number.POSITIVE_INFINITY;

      for (const target of coveredTargets) {
        const targetCoverage =
          options.coverage.get(getFeaturedCoverageKey(entry.runtime, entry.modelRef, target)) ?? 0;

        if (targetCoverage < entry.minimumRunsPerDevice) {
          underfilledTargetCount += 1;
        }

        weakestTargetCoverage = Math.min(weakestTargetCoverage, targetCoverage);
      }

      if (!Number.isFinite(weakestTargetCoverage)) {
        weakestTargetCoverage = 0;
      }
    }

    const exactCoverage =
      useTargetedEntries && deviceTarget
        ? options.coverage.get(
            getFeaturedCoverageKey(entry.runtime, entry.modelRef, deviceTarget),
          ) ?? 0
        : 0;
    const repoPreferredQuantSaturated =
      useTargetedEntries && deviceTarget
        ? (coveredPreferredQuantBucketsByRepoAndTarget.get(
            getFeaturedCoverageKey(entry.runtime, entry.hfRepoId, deviceTarget),
          )?.size ?? 0) >= 2
        : false;
    const distinctCoveredTargets = coveredTargets.length;

    return {
      entry,
      breadthGap: Math.max(0, entry.minimumDistinctDevices - distinctCoveredTargets),
      exactCoverage,
      exactGap:
        useTargetedEntries && deviceTarget
          ? Math.max(0, entry.minimumRunsPerDevice - exactCoverage)
          : 0,
      index: wishlist.indexOf(entry),
      distinctCoveredTargets,
      repoBreadthGap:
        repoEntryCount > 1
          ? Math.max(0, FEATURED_REPO_BREADTH_TARGET - distinctCoveredEntriesForRepo)
          : 0,
      repoPreferredQuantSaturated,
      distinctCoveredEntriesForRepo,
      underfilledTargetCount,
      weakestTargetCoverage,
    };
  });

  if (useTargetedEntries) {
    scoredEntries.sort(
      (left, right) =>
        Number(left.repoPreferredQuantSaturated) - Number(right.repoPreferredQuantSaturated) ||
        right.entry.priority - left.entry.priority ||
        right.exactGap - left.exactGap ||
        right.breadthGap - left.breadthGap ||
        right.repoBreadthGap - left.repoBreadthGap ||
        left.exactCoverage - right.exactCoverage ||
        left.distinctCoveredEntriesForRepo - right.distinctCoveredEntriesForRepo ||
        left.distinctCoveredTargets - right.distinctCoveredTargets ||
        left.index - right.index,
    );
  } else {
    scoredEntries.sort(
      (left, right) =>
        right.entry.priority - left.entry.priority ||
        right.breadthGap - left.breadthGap ||
        right.repoBreadthGap - left.repoBreadthGap ||
        right.underfilledTargetCount - left.underfilledTargetCount ||
        left.distinctCoveredEntriesForRepo - right.distinctCoveredEntriesForRepo ||
        left.distinctCoveredTargets - right.distinctCoveredTargets ||
        left.weakestTargetCoverage - right.weakestTargetCoverage ||
        left.index - right.index,
    );
  }

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
  const limit = clampFeaturedLimit(query.limit);
  const deviceTarget = normalizeFeaturedDeviceTarget(query);
  const runtimeWishlist = runtime
    ? FEATURED_WISHLIST.filter((entry) => entry.runtime === runtime)
    : FEATURED_WISHLIST;
  const memoryBudgetBytes = getFeaturedMemoryBudgetBytes(query, deviceTarget);
  const fileSizes = new Map<string, number>();

  for (const entry of runtimeWishlist) {
    if (
      entry.fileSizeBytes != null &&
      Number.isSafeInteger(entry.fileSizeBytes) &&
      entry.fileSizeBytes > 0
    ) {
      fileSizes.set(entry.modelRef, entry.fileSizeBytes);
    }
  }

  for (const row of await getFeaturedModelSizeRows(runtimeWishlist)) {
    if (!row.modelRef || row.fileSizeBytes == null || row.fileSizeBytes <= 0) continue;

    const existing = fileSizes.get(row.modelRef);
    if (existing == null || row.fileSizeBytes < existing) {
      fileSizes.set(row.modelRef, row.fileSizeBytes);
    }
  }

  const wishlist =
    memoryBudgetBytes == null
      ? [...runtimeWishlist]
      : runtimeWishlist.filter((entry) => {
          const fileSizeBytes = fileSizes.get(entry.modelRef);
          return (
            fileSizeBytes == null ||
            Math.ceil(fileSizeBytes * FEATURED_REQUIRED_MEMORY_MULTIPLIER) <= memoryBudgetBytes
          );
        });

  const { coverage, distinctTargets } = buildFeaturedCoverageIndex(
    await getHistoricalFeaturedCoverageRows(wishlist, runtime),
  );

  return selectFeaturedWishlistEntries({
    coverage,
    distinctTargets,
    deviceTarget,
    limit,
    runtime,
    wishlist,
  }).map(toFeaturedModel);
}
