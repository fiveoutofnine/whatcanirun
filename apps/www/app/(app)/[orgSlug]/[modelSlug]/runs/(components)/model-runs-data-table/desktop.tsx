'use client';

import { useMemo } from 'react';

import type { ModelRunsDataTableInternalProps } from '.';
import type { ModelRunsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import { FileText } from 'lucide-react';

import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import RelativeDate from '@/components/templates/relative-date';
import StateInfo from '@/components/templates/state-info';
import {
  DeviceTableCell,
  MemoryTableCell,
  QuantTableCell,
  RuntimeTableCell,
} from '@/components/templates/table-cells';
import { Table } from '@/components/ui';

const ModelRunsDataTableDesktop: React.FC<ModelRunsDataTableInternalProps> = (tableOptions) => {
  const columns: ColumnDef<ModelRunsDataTableValue>[] = useMemo(
    () => [
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
              gpuCount={device.gpuCount}
              ramGb={device.ramGb}
              osName={device.osName}
            />
          );
        },
      },
      {
        id: 'quant',
        accessorKey: 'modelId',
        enableSorting: false,
        header: () => <div>Quant</div>,
        cell: ({ row }) => {
          const { model } = row.original;
          const info = model.info;
          return (
            <QuantTableCell
              quant={info?.quant || model.quant}
              format={model.format}
              source={info?.source || model.source}
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
                  <DeviceTableCell.Skeleton key={0} />,
                  <QuantTableCell.Skeleton key={1} />,
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
                  <div key={6} className="ml-auto h-5 w-20 animate-pulse rounded bg-gray-9" />,
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

export default ModelRunsDataTableDesktop;
