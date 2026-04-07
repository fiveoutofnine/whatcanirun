import { unstable_cache as cache } from 'next/cache';
import { Suspense } from 'react';

import Hero from './(components)/hero';
import ModelsDataTable from './(components)/models-data-table';
import ModelsDataTableSkeleton from './(components)/models-data-table/skeleton';
import type { ModelsDataTableValue } from './(components)/models-data-table/types';
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
          gpuCount: sql<number>`MIN(${view__model_stats_by_device.deviceGpuCount})`.as('gpu_count'),
          ramGb: sql<number>`MIN(${view__model_stats_by_device.deviceRamGb})`.as('ram_gb'),
          modelCount: countDistinct(view__model_stats_by_device.modelId).as('model_count'),
        })
        .from(view__model_stats_by_device)
        .groupBy(view__model_stats_by_device.deviceChipId),
    ['hero-chip-options'],
    { tags: [], revalidate: 600 },
  )();

  // If the device param is invalid/not found, pass empty data so the user sees
  // instructions on how to submit results.
  const chipIds = new Set(chipRows.map((r) => r.chipId));
  const validDevice = device !== undefined && chipIds.has(device);

  const sorted = [...chipRows].sort((a, b) => b.modelCount - a.modelCount);
  const effectiveDevice = device && validDevice ? device : (sorted[0]?.chipId ?? FALLBACK_DEVICE);

  // ---------------------------------------------------------------------------
  // Total + Params + Data (skip queries for invalid device)
  // ---------------------------------------------------------------------------

  let total = 0;
  let data: ModelsDataTableValue[] = [];
  const sortingState = createSortingParser.parseServerSide(sortingParam);
  let pageSize = 25;
  let pageIndex = 0;

  if (!device || validDevice) {
    const deviceFilter = eq(view__model_stats_by_device.deviceChipId, sql`${effectiveDevice}`);

    [{ count: total }] = await cache(
      async () =>
        await db.select({ count: count() }).from(view__model_stats_by_device).where(deviceFilter),
      [`models-data-table-total-${effectiveDevice}`],
      { tags: [], revalidate: 600 },
    )();

    const sorting = sortingState.length > 0 ? sortingState[0] : null;
    ({ pageSize, pageIndex } = createPaginationParser(total).parseServerSide(pagination));

    data = await cache(
      async () =>
        await db
          .select()
          .from(view__model_stats_by_device)
          .where(deviceFilter)
          .orderBy(() => {
            if (!sorting) return desc(view__model_stats_by_device.compositeScore);

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
              case 'score':
                return sorting.desc
                  ? desc(view__model_stats_by_device.compositeScore)
                  : asc(view__model_stats_by_device.compositeScore);
              default:
                return desc(view__model_stats_by_device.avgDecodeTps);
            }
          })
          .limit(pageSize)
          .offset(pageIndex * pageSize),
      [`models-data-table-${effectiveDevice}-${pageIndex}-${pageSize}-${JSON.stringify(sorting)}`],
      { tags: [], revalidate: 600 },
    )();
  }

  return (
    <ContainerLayout className="flex flex-col">
      <Hero />
      <H2 className="mb-1">Models</H2>
      <p className="mb-4 text-sm tabular-nums leading-normal text-gray-11 md:text-base">
        Results include trials with <span className="tabular-nums">4,096</span> input tokens and{' '}
        <span className="tabular-nums">1,024</span> output tokens only.
      </p>
      <Suspense fallback={<ModelsDataTableSkeleton rowCount={25} />}>
        <ModelsDataTable
          data={data}
          total={total}
          queryParams={{
            pagination: { pageIndex, pageSize },
            sorting: sortingState,
            stale: false,
          }}
        />
      </Suspense>
    </ContainerLayout>
  );
}
