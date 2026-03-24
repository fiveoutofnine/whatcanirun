import { cacheLife } from 'next/cache';

import ModelsDataTable from '.';
import { asc, count, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { view__model_stats_by_device } from '@/lib/db/schema';
import { createPaginationParser, createSortingParser } from '@/lib/query-states';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelsDataTableServerProps = {
  searchParams: Promise<{ pagination?: string; sorting?: string }>;
};

// -----------------------------------------------------------------------------
// Cached data fetcher
// -----------------------------------------------------------------------------

async function fetchData(paginationParam?: string, sortingParam?: string) {
  'use cache';
  cacheLife({ stale: 300, revalidate: 300 });

  // ---------------------------------------------------------------------------
  // Total
  // ---------------------------------------------------------------------------

  const [{ count: total }] = await db.select({ count: count() }).from(view__model_stats_by_device);

  // ---------------------------------------------------------------------------
  // Params
  // ---------------------------------------------------------------------------

  const sortingState = createSortingParser.parseServerSide(sortingParam);
  const sorting = sortingState.length > 0 ? sortingState[0] : null;

  const { pageSize, pageIndex } = createPaginationParser(total).parseServerSide(paginationParam);

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const data = await db
    .select()
    .from(view__model_stats_by_device)
    .orderBy(() => {
      if (!sorting) return desc(view__model_stats_by_device.avgDecodeTps);

      switch (sorting.id) {
        case 'avgDecodeTps':
          return sorting.desc
            ? desc(view__model_stats_by_device.avgDecodeTps)
            : asc(view__model_stats_by_device.avgDecodeTps);
        default:
          return desc(view__model_stats_by_device.avgDecodeTps);
      }
    })
    .limit(pageSize)
    .offset(pageIndex * pageSize);

  return { data, total, pageIndex, pageSize, sortingState };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelsDataTableServer: React.FC<ModelsDataTableServerProps> = async ({ searchParams }) => {
  const { pagination, sorting } = await searchParams;
  const { data, total, pageIndex, pageSize, sortingState } = await fetchData(pagination, sorting);

  return (
    <ModelsDataTable
      data={data}
      total={total}
      queryParams={{
        pagination: { pageIndex, pageSize },
        sorting: sortingState,
      }}
    />
  );
};

export default ModelsDataTableServer;
