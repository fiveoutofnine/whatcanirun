import { unstable_cache as cache } from 'next/cache';
import { Suspense } from 'react';

import RunsDataTable from './(components)/runs-data-table';
import RunsDataTableSkeleton from './(components)/runs-data-table/skeleton';
import { asc, count, desc, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { runs } from '@/lib/db/schema';
import { createPaginationParser, createSortingParser } from '@/lib/query-states';

import ContainerLayout from '@/components/layouts/container';
import { H2 } from '@/components/templates/mdx';

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    pagination?: string;
    sorting?: string;
  }>;
}) {
  const { pagination, sorting: sortingParam } = await searchParams;

  // ---------------------------------------------------------------------------
  // Total
  // ---------------------------------------------------------------------------

  const [{ count: total }] = await cache(
    async () => await db.select({ count: count() }).from(runs),
    ['runs-data-table-total'],
    { tags: [], revalidate: 300 },
  )();

  // ---------------------------------------------------------------------------
  // Params
  // ---------------------------------------------------------------------------

  const sortingState = createSortingParser.parseServerSide(sortingParam);
  const sorting = sortingState.length > 0 ? sortingState[0] : null;
  const { pageSize, pageIndex } = createPaginationParser(total, 10).parseServerSide(pagination);

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const dir = sorting?.desc ? sql`DESC` : sql`ASC`;
  const orderByColumn = (() => {
    if (!sorting) return desc(runs.createdAt);

    switch (sorting.id) {
      case 'model':
        return sql`(SELECT display_name FROM models WHERE models.id = ${runs.modelId}) ${dir}`;
      case 'device':
        return sql`(SELECT cpu FROM devices WHERE devices.id = ${runs.deviceId}) ${dir}`;
      case 'runtime':
        return sql`${runs.runtimeVersion} ${dir}, ${runs.runtimeName} ${dir}`;
      case 'decode':
        return sorting.desc ? desc(runs.decodeTpsMean) : asc(runs.decodeTpsMean);
      case 'prefill':
        return sorting.desc ? desc(runs.prefillTpsMean) : asc(runs.prefillTpsMean);
      case 'memory':
        return sorting.desc ? desc(runs.peakRssMb) : asc(runs.peakRssMb);
      case 'date':
        return sorting.desc ? desc(runs.createdAt) : asc(runs.createdAt);
      default:
        return desc(runs.createdAt);
    }
  })();

  const data = await cache(
    async () =>
      await db.query.runs.findMany({
        with: {
          model: {
            with: {
              info: {
                with: {
                  lab: true,
                  quantizedBy: true,
                  family: true,
                },
              },
            },
          },
          device: true,
        },
        orderBy: orderByColumn,
        limit: pageSize,
        offset: pageIndex * pageSize,
      }),
    [`runs-data-table-${pageIndex}-${pageSize}-${JSON.stringify(sorting)}`],
    { tags: [], revalidate: 300 },
  )();

  return (
    <ContainerLayout className="flex flex-col">
      <H2 className="mb-1" link={false}>
        Runs
      </H2>
      <p className="mb-4 text-sm leading-normal text-gray-11 md:text-base">
        Most recent benchmark runs across all devices and models.
      </p>
      <Suspense fallback={<RunsDataTableSkeleton rowCount={25} />}>
        <RunsDataTable
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
