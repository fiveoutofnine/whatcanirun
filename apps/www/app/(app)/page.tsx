import { unstable_cache as cache } from 'next/cache';
import { Suspense } from 'react';

import Hero from './(components)/hero';
import ModelsDataTable from './(components)/models-data-table';
import ModelsDataTableSkeleton from './(components)/models-data-table/skeleton';
import { asc, count, countDistinct, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { view__model_stats_by_device } from '@/lib/db/schema';
import { createPaginationParser, createSortingParser } from '@/lib/query-states';

import ContainerLayout from '@/components/layouts/container';
import { H2 } from '@/components/templates/mdx';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const FALLBACK_DEVICE = 'Apple M1 Max:10:Apple M1 Max:32:64';

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    pagination?: string;
    sorting?: string;
    device?: string;
  }>;
}) {
  const { pagination, sorting: sortingParam, device } = await searchParams;

  // ---------------------------------------------------------------------------
  // Chip options
  // ---------------------------------------------------------------------------

  const chipRows = await cache(
    async () =>
      await db
        .select({
          chipId: view__model_stats_by_device.deviceChipId,
          cpu: sql<string>`MIN(${view__model_stats_by_device.deviceCpu})`.as('cpu'),
          cpuCores: sql<number>`MIN(${view__model_stats_by_device.deviceCpuCores})`.as('cpu_cores'),
          gpu: sql<string>`MIN(${view__model_stats_by_device.deviceGpu})`.as('gpu'),
          gpuCores: sql<number>`MIN(${view__model_stats_by_device.deviceGpuCores})`.as('gpu_cores'),
          ramGb: sql<number>`MIN(${view__model_stats_by_device.deviceRamGb})`.as('ram_gb'),
          modelCount: countDistinct(view__model_stats_by_device.modelId).as('model_count'),
        })
        .from(view__model_stats_by_device)
        .groupBy(view__model_stats_by_device.deviceChipId),
    ['hero-chip-options'],
    { tags: [], revalidate: 600 },
  )();

  // Prefer the one with the most models, then hardcoded fallback.
  const chipIds = new Set(chipRows.map((r) => r.chipId));
  let effectiveDevice: string;
  if (device && chipIds.has(device)) {
    effectiveDevice = device;
  } else {
    const sorted = [...chipRows].sort((a, b) => b.modelCount - a.modelCount);
    effectiveDevice = sorted[0]?.chipId ?? FALLBACK_DEVICE;
  }

  const deviceFilter = eq(view__model_stats_by_device.deviceChipId, sql`${effectiveDevice}`);

  // ---------------------------------------------------------------------------
  // Total
  // ---------------------------------------------------------------------------

  const [{ count: total }] = await cache(
    async () =>
      await db.select({ count: count() }).from(view__model_stats_by_device).where(deviceFilter),
    [`models-data-table-total-${effectiveDevice}`],
    { tags: [], revalidate: 600 },
  )();

  // ---------------------------------------------------------------------------
  // Params
  // ---------------------------------------------------------------------------

  const sortingState = createSortingParser.parseServerSide(sortingParam);
  const sorting = sortingState.length > 0 ? sortingState[0] : null;

  const { pageSize, pageIndex } = createPaginationParser(total).parseServerSide(pagination);

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const data = await cache(
    async () =>
      await db
        .select()
        .from(view__model_stats_by_device)
        .where(deviceFilter)
        .orderBy(() => {
          if (!sorting) return desc(view__model_stats_by_device.avgDecodeTps);

          switch (sorting.id) {
            case 'model':
              return sorting.desc
                ? desc(view__model_stats_by_device.modelDisplayName)
                : asc(view__model_stats_by_device.modelDisplayName);
            case 'decode':
              return sorting.desc
                ? desc(view__model_stats_by_device.avgDecodeTps)
                : asc(view__model_stats_by_device.avgDecodeTps);
            case 'prefill':
              return sorting.desc
                ? desc(view__model_stats_by_device.avgPrefillTps)
                : asc(view__model_stats_by_device.avgPrefillTps);
            case 'ttft':
              return sorting.desc
                ? desc(view__model_stats_by_device.ttftP50Ms)
                : asc(view__model_stats_by_device.ttftP50Ms);
            case 'memory':
              return sorting.desc
                ? desc(view__model_stats_by_device.avgPeakRssMb)
                : asc(view__model_stats_by_device.avgPeakRssMb);
            case 'trials':
              return sorting.desc
                ? desc(view__model_stats_by_device.trialCount)
                : asc(view__model_stats_by_device.trialCount);
            default:
              return desc(view__model_stats_by_device.avgDecodeTps);
          }
        })
        .limit(pageSize)
        .offset(pageIndex * pageSize),
    [`models-data-table-${effectiveDevice}-${pageIndex}-${pageSize}-${JSON.stringify(sorting)}`],
    { tags: [], revalidate: 600 },
  )();

  return (
    <ContainerLayout className="flex flex-col">
      <Hero />
      <H2 className="mb-2">Models</H2>
      <Suspense fallback={<ModelsDataTableSkeleton rowCount={25} />}>
        <ModelsDataTable
          data={data}
          total={total}
          queryParams={{
            pagination: { pageIndex, pageSize },
            sorting: sortingState,
            stale: device !== undefined && effectiveDevice !== device,
          }}
        />
      </Suspense>
    </ContainerLayout>
  );
}
