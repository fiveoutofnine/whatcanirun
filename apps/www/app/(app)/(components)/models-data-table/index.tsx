'use client';

import ModelsDataTableDesktop from './desktop';
import ModelsDataTableMobile from './mobile';
import type { ModelsDataTableQueryParams, ModelsDataTableValue } from './types';
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

export type ModelsDataTableProps = {
  data: ModelsDataTableValue[];
  total: number;
  queryParams: ModelsDataTableQueryParams;
};

export type ModelsDataTableInternalProps = Omit<TableOptions<ModelsDataTableValue>, 'columns'> & {
  total: number;
  isLoading: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelsDataTable: React.FC<ModelsDataTableProps> = ({ data, total, queryParams }) => {
  const [sorting, setSorting] = useSortingQueryState('sorting');
  const [pagination, setPagination] = usePaginationQueryState('pagination', total);

  const maxPageIndex = Math.ceil(total / Math.max(pagination.pageSize, 1)) - 1;
  const isLoading =
    queryParams.stale ||
    queryParams.pagination.pageIndex !== pagination.pageIndex ||
    queryParams.pagination.pageSize !== pagination.pageSize ||
    JSON.stringify(queryParams.sorting) !== JSON.stringify(sorting);

  const tableOptions: ModelsDataTableInternalProps = {
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
      <ModelsDataTableDesktop {...tableOptions} />
      <ModelsDataTableMobile {...tableOptions} />
      <DataTablePagination
        pagination={pagination}
        setPagination={setPagination}
        maxPageIndex={maxPageIndex}
      />
    </div>
  );
};

export default ModelsDataTable;
