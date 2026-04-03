import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getModelFamily } from '../utils';
import ModelRunsDataTable from './(components)/model-runs-data-table';
import ModelRunsDataTableSkeleton from './(components)/model-runs-data-table/skeleton';
import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { models, modelsInfo, runs } from '@/lib/db/schema';
import { createPaginationParser, createSortingParser } from '@/lib/query-states';

import { H2 } from '@/components/templates/mdx';

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
  searchParams: Promise<{
    pagination?: string;
    sorting?: string;
  }>;
}) {
  const { orgSlug, modelSlug } = await params;
  const rootPath = `/${orgSlug}/${modelSlug}/runs`;
  const { pagination, sorting: sortingParam } = await searchParams;

  const family = await getModelFamily(orgSlug, modelSlug);
  if (!family) return notFound();

  // ---------------------------------------------------------------------------
  // Model IDs for this family
  // ---------------------------------------------------------------------------

  const familyModelIds = await cache(
    async () => {
      const rows = await db
        .select({ id: models.id })
        .from(modelsInfo)
        .innerJoin(models, eq(models.artifactSha256, modelsInfo.artifactSha256))
        .where(eq(modelsInfo.familyId, family.familyId));
      return rows.map((r) => r.id);
    },
    [`model-runs-family-model-ids-${family.familyId}`],
    { revalidate: 600 },
  )();

  if (familyModelIds.length === 0) {
    return (
      <div
        id={`content-${rootPath}`}
        className="flex grow md:px-6"
        role="tabpanel"
        aria-labelledby={`trigger-${rootPath}`}
      >
        <div className="mx-auto flex w-full max-w-5xl grow flex-col py-4 md:py-6">
          <H2 className="mb-1 px-4 md:px-0">Runs</H2>
          <p className="mb-4 px-4 text-sm leading-normal text-gray-11 md:px-0 md:text-base">
            No benchmark runs found for this model.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Total
  // ---------------------------------------------------------------------------

  const [{ count: total }] = await cache(
    async () =>
      await db.select({ count: count() }).from(runs).where(inArray(runs.modelId, familyModelIds)),
    [`model-runs-data-table-total-${family.familyId}`],
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
        where: inArray(runs.modelId, familyModelIds),
        with: {
          model: {
            with: {
              info: {
                with: {
                  lab: true,
                  quantizedBy: true,
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
    [
      `model-runs-data-table-${family.familyId}-${pageIndex}-${pageSize}-${JSON.stringify(sorting)}`,
    ],
    { tags: [], revalidate: 300 },
  )();

  return (
    <div
      id={`content-${rootPath}`}
      className="flex grow md:px-6"
      role="tabpanel"
      aria-labelledby={`trigger-${rootPath}`}
    >
      <div className="mx-auto flex w-full max-w-5xl grow flex-col py-4 md:py-6">
        <H2 className="mb-1 px-4 md:px-0">Runs</H2>
        <p className="mb-4 px-4 text-sm leading-normal text-gray-11 md:px-0 md:text-base">
          View all benchmark runs for this model family.
        </p>
        <Suspense fallback={<ModelRunsDataTableSkeleton rowCount={10} />}>
          <ModelRunsDataTable
            data={data}
            total={total}
            queryParams={{
              pagination: { pageIndex, pageSize },
              sorting: sortingState,
              stale: false,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
