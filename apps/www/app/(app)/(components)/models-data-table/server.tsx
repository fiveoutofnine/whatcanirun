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
// Component
// -----------------------------------------------------------------------------

const ModelsDataTableServer: React.FC<ModelsDataTableServerProps> = async ({ searchParams }) => {
  'use cache';
  cacheLife({ stale: 300, revalidate: 300 });

  const searchParamsValue = await searchParams;

  // ---------------------------------------------------------------------------
  // Total
  // ---------------------------------------------------------------------------

  const [{ count: total }] = await db.select({ count: count() }).from(view__model_stats_by_device);

  // ---------------------------------------------------------------------------
  // Params
  // ---------------------------------------------------------------------------

  const sortingState = createSortingParser.parseServerSide(searchParamsValue.sorting);
  const sorting = sortingState.length > 0 ? sortingState[0] : null;

  const { pageSize, pageIndex } = createPaginationParser(total).parseServerSide(
    searchParamsValue.pagination,
  );

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
