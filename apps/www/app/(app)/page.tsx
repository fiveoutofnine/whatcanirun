import { unstable_cache as cache } from 'next/cache';
import { Suspense } from 'react';

import Hero from './(components)/hero';
import ModelsDataTable from './(components)/models-data-table';
import ModelsDataTableSkeleton from './(components)/models-data-table/skeleton';
import { asc, count, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { view__model_stats_by_device } from '@/lib/db/schema';
import { createPaginationParser, createSortingParser } from '@/lib/query-states';

import ContainerLayout from '@/components/layouts/container';
import { H2 } from '@/components/templates/mdx';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagination?: string; sorting?: string }>;
}) {
  const { pagination, sorting: sortingParam } = await searchParams;

  // ---------------------------------------------------------------------------
  // Total
  // ---------------------------------------------------------------------------

  const [{ count: total }] = await cache(
    async () => await db.select({ count: count() }).from(view__model_stats_by_device),
    ['models-data-table-total'],
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

  const data = await db
    .select()
    .from(view__model_stats_by_device)
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
    .offset(pageIndex * pageSize);

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
          }}
        />
      </Suspense>
    </ContainerLayout>
  );
}
