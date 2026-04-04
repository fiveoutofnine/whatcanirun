'use client';

import { useMemo } from 'react';

import type { RunsDataTableInternalProps } from '.';
import type { RunsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import { FileText } from 'lucide-react';

import { RunStatus } from '@/lib/db/schema';

import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import RelativeDate from '@/components/templates/relative-date';
import StateInfo from '@/components/templates/state-info';
import {
  DeviceTableCell,
  MemoryTableCell,
  ModelTableCell,
  RuntimeTableCell,
} from '@/components/templates/table-cells';
import { Badge, Table } from '@/components/ui';

const STATUS_BADGE_INTENT = {
  [RunStatus.VERIFIED]: 'success',
  [RunStatus.PENDING]: 'warning',
  [RunStatus.FLAGGED]: 'orange',
  [RunStatus.REJECTED]: 'fail',
} as const;

const RunsDataTableDesktop: React.FC<RunsDataTableInternalProps> = (tableOptions) => {
  const columns: ColumnDef<RunsDataTableValue>[] = useMemo(
    () => [
      {
        id: 'model',
        accessorKey: 'modelId',
        header: ({ column }) => (
          <DataTableSortHeader column={column} lowLabel="A" highLabel="Z">
            Model
          </DataTableSortHeader>
        ),
        cell: ({ row }) => {
          const { model } = row.original;
          const info = model.info;
          return (
            <ModelTableCell
              displayName={info?.name || model.displayName}
              quant={info?.quant || model.quant}
              source={info?.source || model.source}
              runtimeName={row.original.runtimeName}
              fileSizeBytes={info?.fileSizeBytes || model.fileSizeBytes}
              labSlug={info?.lab?.slug}
              familySlug={info?.family?.slug}
              lab={
                info?.lab
                  ? {
                      name: info.lab.name,
                      logoUrl: info.lab.logoUrl,
                      websiteUrl: info.lab.websiteUrl,
                      slug: info.lab.slug,
                    }
                  : undefined
              }
              quantizedBy={
                info?.quantizedBy
                  ? {
                      name: info.quantizedBy.name,
                      logoUrl: info.quantizedBy.logoUrl,
                      websiteUrl: info.quantizedBy.websiteUrl,
                    }
                  : undefined
              }
            />
          );
        },
      },
      {
        id: 'device',
        accessorKey: 'deviceId',
        header: ({ column }) => (
          <DataTableSortHeader column={column} lowLabel="A" highLabel="Z">
            Device
          </DataTableSortHeader>
        ),
        cell: ({ row }) => {
          const { device } = row.original;
          return (
            <DeviceTableCell
              cpu={device.cpu}
              cpuCores={device.cpuCores}
              gpu={device.gpu}
              gpuCores={device.gpuCores}
              ramGb={device.ramGb}
              osName={device.osName}
            />
          );
        },
      },
      {
        id: 'runtime',
        accessorKey: 'runtimeName',
        header: ({ column }) => (
          <DataTableSortHeader
            className="ml-right w-fit"
            column={column}
            lowLabel="A"
            highLabel="Z"
          >
            Runtime
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <RuntimeTableCell
            runtimeName={row.original.runtimeName}
            runtimeVersion={row.original.runtimeVersion}
          />
        ),
      },
      {
        id: 'decode',
        accessorKey: 'decodeTpsMean',
        header: ({ column }) => (
          <DataTableSortHeader
            className="ml-auto w-fit"
            column={column}
            lowLabel="Slow"
            highLabel="Fast"
          >
            Decode
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-fit text-nowrap text-right tabular-nums">
            {Number(row.original.decodeTpsMean).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-gray-11">tok/s</span>
          </div>
        ),
      },
      {
        id: 'prefill',
        accessorKey: 'prefillTpsMean',
        header: ({ column }) => (
          <DataTableSortHeader
            className="ml-auto w-fit"
            column={column}
            lowLabel="Slow"
            highLabel="Fast"
          >
            Prefill
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-fit text-nowrap text-right tabular-nums">
            {row.original.prefillTpsMean != null
              ? `${Number(row.original.prefillTpsMean).toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} `
              : '— '}
            <span className="text-gray-11">tok/s</span>
          </div>
        ),
      },
      {
        id: 'memory',
        accessorKey: 'peakRssMb',
        header: ({ column }) => (
          <DataTableSortHeader className="mr-auto w-fit text-nowrap" column={column}>
            Peak memory
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <MemoryTableCell
            align="left"
            usedGb={row.original.peakRssMb / 1024}
            totalGb={row.original.device.ramGb}
          />
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        enableSorting: false,
        header: () => <div className="flex justify-end">Status</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Badge
              variant="outline"
              size="sm"
              type="text"
              intent={STATUS_BADGE_INTENT[row.original.status]}
            >
              {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
            </Badge>
          </div>
        ),
      },
      {
        id: 'date',
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableSortHeader
            className="ml-auto w-fit"
            column={column}
            lowLabel="Oldest"
            highLabel="Recent"
          >
            Date
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RelativeDate
              className="min-w-fit text-nowrap"
              date={row.original.createdAt}
              type="relative"
              clickable
            />
          </div>
        ),
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...tableOptions,
    columns,
  });

  return (
    <Table.Root containerClassName="hidden md:block border border-gray-6 rounded-xl hide-scrollbar [&>table]:border-0">
      <Table.Header className="max-w-7xl">
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <Table.Head
                  key={header.id}
                  colSpan={header.colSpan}
                  className="first:pl-4 last:pr-4 md:first:pl-6 md:last:pr-6"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              );
            })}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) =>
            !tableOptions.isLoading ? (
              <Table.Row
                key={row.id}
                className="h-16"
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    className="first:pl-4 last:pr-4 md:first:pl-6 md:last:pr-6"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            ) : (
              <Table.Row key={row.id} className="h-16">
                {[
                  <ModelTableCell.Skeleton key={0} />,
                  <DeviceTableCell.Skeleton key={1} />,
                  <RuntimeTableCell.Skeleton key={2} showVersion />,
                  <div
                    key={3}
                    className="ml-auto h-[1.125rem] w-20 animate-pulse rounded bg-gray-9"
                  />,
                  <div
                    key={4}
                    className="ml-auto h-[1.125rem] w-24 animate-pulse rounded bg-gray-9"
                  />,
                  <MemoryTableCell.Skeleton key={5} align="left" />,
                  <div key={6} className="ml-auto h-5 w-16 animate-pulse rounded-full bg-gray-9" />,
                  <div key={7} className="ml-auto h-5 w-20 animate-pulse rounded bg-gray-9" />,
                ].map((skeleton, i) => (
                  <Table.Cell key={i} className="first:pl-4 last:pr-4 md:first:pl-6 md:last:pr-6">
                    {skeleton}
                  </Table.Cell>
                ))}
              </Table.Row>
            ),
          )
        ) : (
          <Table.Row>
            <Table.Cell colSpan={columns.length}>
              <StateInfo
                className="mx-auto py-9"
                size="sm"
                title="No runs found"
                description="Be the first to submit a benchmark run."
                icon={<FileText />}
              />
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Root>
  );
};

export default RunsDataTableDesktop;
