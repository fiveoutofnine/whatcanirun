'use client';

import { useMemo } from 'react';

import type { ModelsDataTableInternalProps } from '.';
import type { ModelsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import { ChevronRight, FileText } from 'lucide-react';

import StateInfo from '@/components/templates/state-info';
import { Button, Table } from '@/components/ui';

const ModelsDataTableDesktop: React.FC<ModelsDataTableInternalProps> = (tableOptions) => {
  const columns: ColumnDef<ModelsDataTableValue>[] = useMemo(
    () => [
      {
        id: 'model',
        accessorKey: 'modelDisplayName',
        header: () => 'Model',
        cell: ({ row }) => <span className="font-medium">{row.original.modelDisplayName}</span>,
      },
      {
        id: 'format',
        accessorKey: 'modelFormat',
        header: () => 'Format',
      },
      {
        id: 'quant',
        accessorKey: 'modelQuant',
        header: () => 'Quant',
      },
      {
        id: 'params',
        accessorKey: 'modelParameters',
        header: () => <div className="text-right">Params</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.modelParameters}</div>
        ),
      },
      {
        id: 'device',
        accessorKey: 'deviceCpu',
        header: () => 'Device',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="line-clamp-1">{row.original.deviceCpu ?? row.original.deviceGpu}</span>
            <span className="text-xs text-gray-11">
              {row.original.deviceOsName} · {row.original.deviceRamGb} GB
            </span>
          </div>
        ),
      },
      {
        id: 'runtime',
        accessorKey: 'runtimeName',
        header: () => 'Runtime',
      },
      {
        id: 'decode',
        accessorKey: 'avgDecodeTps',
        header: () => <div className="text-right">Decode (tok/s)</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.avgDecodeTps).toFixed(1)}
          </div>
        ),
      },
      {
        id: 'prefill',
        accessorKey: 'avgPrefillTps',
        header: () => <div className="text-right">Prefill (tok/s)</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.avgPrefillTps).toFixed(1)}
          </div>
        ),
      },
      {
        id: 'ttft_p50',
        accessorKey: 'ttftP50Ms',
        header: () => <div className="text-right">TTFT p50 (ms)</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{Number(row.original.ttftP50Ms).toFixed(0)}</div>
        ),
      },
      {
        id: 'ttft_p95',
        accessorKey: 'ttftP95Ms',
        header: () => <div className="text-right">TTFT p95 (ms)</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{Number(row.original.ttftP95Ms).toFixed(0)}</div>
        ),
      },
      {
        id: 'peak_rss',
        accessorKey: 'avgPeakRssMb',
        header: () => <div className="text-right">Peak RSS (MB)</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.avgPeakRssMb).toFixed(0)}
          </div>
        ),
      },
      {
        id: 'runs',
        accessorKey: 'runCount',
        header: () => <div className="text-right">Runs</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.runCount}</div>,
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
                  <div
                    key={0}
                    className="ml-auto h-[1.125rem] w-12 animate-pulse rounded bg-gray-9"
                  />,
                  <div
                    key={1}
                    className="ml-auto h-[1.125rem] w-14 animate-pulse rounded bg-gray-9"
                  />,
                  <div
                    key={3}
                    className="ml-auto h-[1.125rem] w-14 animate-pulse rounded bg-gray-9"
                  />,
                  <div key={4} className="ml-auto h-5 w-24 animate-pulse rounded bg-gray-9" />,
                  <div key={5} className="ml-auto h-5 w-24 animate-pulse rounded bg-gray-9" />,
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
                title="No models yet"
                description="Be the first to submit a benchmark."
                icon={<FileText />}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  intent="info"
                  href="/docs"
                  rightIcon={<ChevronRight />}
                >
                  Submit
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
