'use client';

import ModelsDataTableDesktop from './desktop';
import ModelsDataTableMobile from './mobile';
import type { ModelsDataTableValue } from './types';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';

import DataTablePagination from '@/components/templates/data-table-pagination';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelsDataTableSkeletonProps = {
  rowCount?: number;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelsDataTableSkeleton: React.FC<ModelsDataTableSkeletonProps> = ({ rowCount = 25 }) => {
  const EMPTY_ROW = {
    modelDisplayName: '',
    modelQuant: '',
    modelParameters: '',
    modelArchitecture: '',
    deviceCpu: '',
    deviceCpuCores: 0,
    deviceGpu: '',
    deviceGpuCores: 0,
    deviceRamGb: 0,
    runtimeName: '',
    avgDecodeTps: 0,
    avgPrefillTps: 0,
    ttftP50Ms: 0,
    avgPeakRssMb: 0,
    trialCount: 0,
    runCount: 0,
  } as ModelsDataTableValue;

  const data = Array.from({ length: rowCount }, () => EMPTY_ROW);
  const pagination = { pageIndex: 0, pageSize: rowCount };
  // eslint-disable-next-line
  const noop = () => { };

  const tableOptions = {
    data,
    state: { sorting: [], pagination },
    manualPagination: true,
    manualSorting: true,
    onSortingChange: noop,
    onPaginationChange: noop,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    total: rowCount,
    isLoading: true,
  };

  return (
    <div className="flex w-full flex-col">
      <ModelsDataTableDesktop {...tableOptions} />
      <ModelsDataTableMobile {...tableOptions} />
      <DataTablePagination pagination={pagination} setPagination={noop} maxPageIndex={0} />
    </div>
  );
};

export default ModelsDataTableSkeleton;
