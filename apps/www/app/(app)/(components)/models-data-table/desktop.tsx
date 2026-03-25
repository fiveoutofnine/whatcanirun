'use client';

import { useCallback, useMemo, useState } from 'react';

import type { ModelsDataTableInternalProps } from '.';
import type { ModelsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import { Check, Copy, FileText } from 'lucide-react';

import { RUN_COMMAND } from '@/lib/constants/cli';

import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import StateInfo from '@/components/templates/state-info';
import {
  DeviceTableCell,
  ModelTableCell,
  RuntimeTableCell,
} from '@/components/templates/table-cells';
import { Button, Table, toast } from '@/components/ui';

const ModelsDataTableDesktop: React.FC<ModelsDataTableInternalProps> = (tableOptions) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyCommand = useCallback(() => {
    if (copied) return;
    navigator.clipboard.writeText(RUN_COMMAND);
    setCopied(true);
    toast({ title: 'Copied command clipboard!', intent: 'success', hasCloseButton: true });
    setTimeout(() => setCopied(false), 3000);
  }, [copied]);

  const columns: ColumnDef<ModelsDataTableValue>[] = useMemo(
    () => [
      {
        id: 'model',
        accessorKey: 'modelDisplayName',
        header: ({ column }) => (
          <DataTableSortHeader column={column} lowLabel="A" highLabel="Z">
            Model
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <ModelTableCell
            displayName={row.original.modelDisplayName}
            quant={row.original.modelQuant}
            parameters={row.original.modelParameters}
            architecture={row.original.modelArchitecture}
          />
        ),
      },
      {
        id: 'device',
        accessorKey: 'deviceCpu',
        header: () => 'Device',
        cell: ({ row }) => (
          <DeviceTableCell
            cpu={row.original.deviceCpu}
            cpuCores={row.original.deviceCpuCores}
            gpu={row.original.deviceGpu}
            gpuCores={row.original.deviceGpuCores}
            ramGb={row.original.deviceRamGb}
          />
        ),
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
        cell: ({ row }) => <RuntimeTableCell runtimeName={row.original.runtimeName} />,
      },
      {
        id: 'decode',
        accessorKey: 'avgDecodeTps',
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
          <div className="text-right tabular-nums">
            {Number(row.original.avgDecodeTps).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-gray-11">tok/s</span>
          </div>
        ),
      },
      {
        id: 'prefill',
        accessorKey: 'avgPrefillTps',
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
          <div className="text-right tabular-nums">
            {Number(row.original.avgPrefillTps).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-gray-11">tok/s</span>
          </div>
        ),
      },
      {
        id: 'ttft',
        accessorKey: 'ttftP50Ms',
        header: ({ column }) => (
          <DataTableSortHeader
            className="ml-auto w-fit"
            column={column}
            lowLabel="Fast"
            highLabel="Slow"
          >
            TTFT
          </DataTableSortHeader>
        ),
        cell: ({ row }) =>
          row.original.ttftP50Ms < 4_000 ? (
            <div className="text-right tabular-nums">
              {Number(row.original.ttftP50Ms).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{' '}
              <span className="text-gray-11">ms</span>
            </div>
          ) : (
            <div className="text-right tabular-nums">
              {Number(row.original.ttftP50Ms / 1_000).toLocaleString(undefined, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}{' '}
              <span className="text-gray-11">sec</span>
            </div>
          ),
      },
      {
        id: 'memory',
        accessorKey: 'avgPeakRssMb',
        header: ({ column }) => (
          <DataTableSortHeader className="ml-auto w-fit text-nowrap" column={column}>
            Peak memory
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.avgPeakRssMb / 1024).toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}{' '}
            <span className="text-gray-11">GB</span>
          </div>
        ),
      },
      {
        id: 'trials',
        accessorKey: 'trials',
        header: ({ column }) => (
          <DataTableSortHeader className="ml-auto w-fit" column={column}>
            Trials
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col items-end text-right tabular-nums">
            <span className="leading-5">{Number(row.original.trialCount).toLocaleString()}</span>
            <span className="text-xs leading-4 text-gray-11">
              {Number(row.original.runCount).toLocaleString()} run
              {row.original.runCount === 1 ? '' : 's'}
            </span>
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
              <Table.Row key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
              <Table.Row key={row.id}>
                {[
                  <ModelTableCell.Skeleton key={0} />,
                  <DeviceTableCell.Skeleton key={1} />,
                  <RuntimeTableCell.Skeleton key={2} />,
                  <div
                    key={3}
                    className="ml-auto h-[1.125rem] w-20 animate-pulse rounded bg-gray-9"
                  />,
                  <div
                    key={4}
                    className="ml-auto h-[1.125rem] w-24 animate-pulse rounded bg-gray-9"
                  />,
                  <div
                    key={5}
                    className="w-18 ml-auto h-[1.125rem] animate-pulse rounded bg-gray-9"
                  />,
                  <div
                    key={6}
                    className="ml-auto h-[1.125rem] w-16 animate-pulse rounded bg-gray-9"
                  />,
                  <div key={7} className="flex flex-col items-end gap-0.5">
                    <div className="h-[1.125rem] w-5 animate-pulse rounded bg-gray-9" />
                    <div className="h-4 w-8 animate-pulse rounded bg-gray-9" />
                  </div>,
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
                title="No runs submitted yet"
                description="Be the first to submit a benchmark for your device."
                icon={<FileText />}
              >
                <Button
                  size="sm"
                  variant="primary"
                  intent="none"
                  rightIcon={
                    copied ? (
                      <Check className="animate-in fade-in zoom-in" />
                    ) : (
                      <Copy className="animate-in fade-in" />
                    )
                  }
                  onClick={copyCommand}
                >
                  {RUN_COMMAND}
                </Button>
              </StateInfo>
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Root>
  );
};

export default ModelsDataTableDesktop;
