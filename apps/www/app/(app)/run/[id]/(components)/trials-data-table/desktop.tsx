'use client';

import { useMemo } from 'react';

import type { TrialsDataTableInternalProps } from '.';
import type { TrialsDataTableValue } from './types';
import { formatDuration, formatNumber } from './utils';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import { FileText } from 'lucide-react';

import StateInfo from '@/components/templates/state-info';
import { MemoryTableCell } from '@/components/templates/table-cells';
import { Table } from '@/components/ui';

const TrialsDataTableDesktop: React.FC<TrialsDataTableInternalProps> = (tableOptions) => {
  const columns: ColumnDef<TrialsDataTableValue>[] = useMemo(
    () => [
      {
        id: 'index',
        header: () => '#',
        cell: ({ row }) => (
          <div className="tabular-nums">{(row.original.trialIndex + 1).toLocaleString()}</div>
        ),
      },
      {
        id: 'input',
        accessorKey: 'inputTokens',
        header: () => 'Input',
        cell: ({ row }) => (
          <div className="tabular-nums">{row.original.inputTokens.toLocaleString()}</div>
        ),
      },
      {
        id: 'output',
        accessorKey: 'outputTokens',
        header: () => 'Output',
        cell: ({ row }) => (
          <div className="tabular-nums">{row.original.outputTokens.toLocaleString()}</div>
        ),
      },
      {
        id: 'ttft',
        accessorKey: 'ttftMs',
        header: () => 'TTFT',
        cell: ({ row }) => (
          <div className="tabular-nums">{formatDuration(row.original.ttftMs)}</div>
        ),
      },
      {
        id: 'total',
        accessorKey: 'totalMs',
        header: () => 'Total',
        cell: ({ row }) => (
          <div className="tabular-nums">{formatDuration(row.original.totalMs)}</div>
        ),
      },
      {
        id: 'prefill',
        accessorKey: 'prefillTps',
        header: () => 'Prefill',
        cell: ({ row }) => (
          <div className="tabular-nums">
            {formatNumber(row.original.prefillTps)} <span className="text-gray-11">tok/s</span>
          </div>
        ),
      },
      {
        id: 'decode',
        accessorKey: 'decodeTps',
        header: () => 'Decode',
        cell: ({ row }) => (
          <div className="tabular-nums">
            {formatNumber(row.original.decodeTps)} <span className="text-gray-11">tok/s</span>
          </div>
        ),
      },
      {
        id: 'memory',
        accessorKey: 'peakRssMb',
        header: () => 'Peak RSS',
        cell: ({ row }) => (
          <MemoryTableCell
            align="left"
            totalGb={row.original.deviceRamGb}
            usedGb={row.original.peakRssMb / 1024}
          />
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
    <Table.Root containerClassName="hidden rounded-xl border border-gray-6 hide-scrollbar md:block [&>table]:border-0">
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head
                key={header.id}
                colSpan={header.colSpan}
                className="first:pl-4 last:pr-4 md:first:pl-6 md:last:pr-6"
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id} className="h-16">
              {row.getVisibleCells().map((cell) => (
                <Table.Cell
                  key={cell.id}
                  className="first:pl-4 last:pr-4 md:first:pl-6 md:last:pr-6"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))
        ) : (
          <Table.Row>
            <Table.Cell colSpan={columns.length}>
              <StateInfo
                className="mx-auto py-9"
                description="This run does not have any trial rows."
                icon={<FileText />}
                size="sm"
                title="No trials found"
              />
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Root>
  );
};

export default TrialsDataTableDesktop;
