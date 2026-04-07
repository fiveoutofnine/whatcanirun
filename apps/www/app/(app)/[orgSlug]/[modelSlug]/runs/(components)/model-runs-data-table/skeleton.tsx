'use client';

import ModelRunsDataTableDesktop from './desktop';
import ModelRunsDataTableMobile from './mobile';
import type { ModelRunsDataTableValue } from './types';
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

type ModelRunsDataTableSkeletonProps = {
  rowCount?: number;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelRunsDataTableSkeleton: React.FC<ModelRunsDataTableSkeletonProps> = ({
  rowCount = 10,
}) => {
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
  } as ModelRunsDataTableValue;

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
      <ModelRunsDataTableDesktop {...tableOptions} />
      <ModelRunsDataTableMobile {...tableOptions} />
      <DataTablePagination pagination={pagination} setPagination={noop} maxPageIndex={0} />
    </div>
  );
};

export default ModelRunsDataTableSkeleton;
