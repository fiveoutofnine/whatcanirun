'use client';

import ModelRunsDataTableDesktop from './desktop';
import ModelRunsDataTableMobile from './mobile';
import type { ModelRunsDataTableQueryParams, ModelRunsDataTableValue } from './types';
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

export type ModelRunsDataTableProps = {
  data: ModelRunsDataTableValue[];
  total: number;
  queryParams: ModelRunsDataTableQueryParams;
};

export type ModelRunsDataTableInternalProps = Omit<
  TableOptions<ModelRunsDataTableValue>,
  'columns'
> & {
  total: number;
  isLoading: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelRunsDataTable: React.FC<ModelRunsDataTableProps> = ({ data, total, queryParams }) => {
  const [sorting, setSorting] = useSortingQueryState('sorting');
  const [pagination, setPagination] = usePaginationQueryState('pagination', total, 10);

  const maxPageIndex = Math.ceil(total / Math.max(pagination.pageSize, 1)) - 1;
  const isLoading =
    queryParams.stale ||
    queryParams.pagination.pageIndex !== pagination.pageIndex ||
    queryParams.pagination.pageSize !== pagination.pageSize ||
    JSON.stringify(queryParams.sorting) !== JSON.stringify(sorting);

  const tableOptions: ModelRunsDataTableInternalProps = {
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
      <ModelRunsDataTableDesktop {...tableOptions} />
      <ModelRunsDataTableMobile {...tableOptions} />
      <DataTablePagination
        pagination={pagination}
        setPagination={setPagination}
        maxPageIndex={maxPageIndex}
      />
    </div>
  );
};

export default ModelRunsDataTable;
