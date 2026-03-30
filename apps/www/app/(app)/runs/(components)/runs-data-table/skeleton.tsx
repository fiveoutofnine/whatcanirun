'use client';

import RunsDataTableDesktop from './desktop';
import RunsDataTableMobile from './mobile';
import type { RunsDataTableValue } from './types';
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

type RunsDataTableSkeletonProps = {
  rowCount?: number;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const RunsDataTableSkeleton: React.FC<RunsDataTableSkeletonProps> = ({ rowCount = 25 }) => {
  const EMPTY_ROW = {
    id: '',
    userId: null,
    deviceId: '',
    modelId: '',
    bundleId: '',
    schemaVersion: '',
    status: 'pending',
    notes: null,
    bundleSha256: '',
    runtimeName: '',
    runtimeVersion: '',
    runtimeBuildFlags: null,
    harnessVersion: '',
    harnessGitSha: '',
    contextLength: null,
    promptTokens: null,
    completionTokens: null,
    ipHash: null,
    ttftP50Ms: 0,
    ttftP95Ms: 0,
    decodeTpsMean: 0,
    prefillTpsMean: null,
    idleRssMb: 0,
    peakRssMb: 0,
    trialsPassed: 0,
    trialsTotal: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    model: {
      id: '',
      displayName: '',
      format: '',
      artifactSha256: '',
      source: null,
      fileSizeBytes: null,
      parameters: null,
      quant: null,
      architecture: null,
      createdAt: new Date(),
      info: null,
    },
    device: {
      id: '',
      cpu: '',
      cpuCores: 0,
      gpu: '',
      gpuCores: 0,
      ramGb: 0,
      chipId: '',
      osName: '',
      osVersion: '',
      createdAt: new Date(),
    },
  } as RunsDataTableValue;

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
      <RunsDataTableDesktop {...tableOptions} />
      <RunsDataTableMobile {...tableOptions} />
      <DataTablePagination pagination={pagination} setPagination={noop} maxPageIndex={0} />
    </div>
  );
};

export default RunsDataTableSkeleton;
