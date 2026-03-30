'use client';

import RunsDataTableDesktop from './desktop';
import RunsDataTableMobile from './mobile';
import type { RunsDataTableQueryParams, RunsDataTableValue } from './types';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type TableOptions,
} from '@tanstack/react-table';

import { usePaginationQueryState, useSortingQueryState } from '@/lib/query-states';

import DataTablePagination from '@/components/templates/data-table-pagination';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export type RunsDataTableProps = {
  data: RunsDataTableValue[];
  total: number;
  queryParams: RunsDataTableQueryParams;
};

export type RunsDataTableInternalProps = Omit<TableOptions<RunsDataTableValue>, 'columns'> & {
  total: number;
  isLoading: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const RunsDataTable: React.FC<RunsDataTableProps> = ({ data, total, queryParams }) => {
  const [sorting, setSorting] = useSortingQueryState('sorting');
  const [pagination, setPagination] = usePaginationQueryState('pagination', total, 10);

  const maxPageIndex = Math.ceil(total / Math.max(pagination.pageSize, 1)) - 1;
  const isLoading =
    queryParams.stale ||
    queryParams.pagination.pageIndex !== pagination.pageIndex ||
    queryParams.pagination.pageSize !== pagination.pageSize ||
    JSON.stringify(queryParams.sorting) !== JSON.stringify(sorting);

  const tableOptions: RunsDataTableInternalProps = {
    data,
    state: {
      sorting,
      pagination,
    },
    manualPagination: true,
    manualSorting: true,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    total,
    isLoading,
  };

  return (
    <div className="flex w-full flex-col">
      <RunsDataTableDesktop {...tableOptions} />
      <RunsDataTableMobile {...tableOptions} />
      <DataTablePagination
        pagination={pagination}
        setPagination={setPagination}
        maxPageIndex={maxPageIndex}
      />
    </div>
  );
};

export default RunsDataTable;
