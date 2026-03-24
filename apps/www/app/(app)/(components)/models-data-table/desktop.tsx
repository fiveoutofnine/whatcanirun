'use client';

import { Fragment, useMemo } from 'react';

import type { ModelsDataTableInternalProps } from '.';
import type { ModelsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { ChevronRight, Cpu, FileText, Gpu, HardDrive, Layers, MemoryStick } from 'lucide-react';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import StateInfo from '@/components/templates/state-info';
import { Button, Table } from '@/components/ui';

const ModelsDataTableDesktop: React.FC<ModelsDataTableInternalProps> = (tableOptions) => {
  const columns: ColumnDef<ModelsDataTableValue>[] = useMemo(
    () => [
      {
        id: 'model',
        accessorKey: 'modelDisplayName',
        header: ({ column }) => (
          <DataTableSortHeader className="w-fit" column={column}>
            Model
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col items-start">
            <span className="line-clamp-1 leading-5">{row.original.modelDisplayName}</span>
            <div className="mt-0 flex h-4 gap-2">
              {[
                {
                  icon: <Layers />,
                  value: row.original.modelQuant,
                  content: 'Quantization',
                },
                {
                  icon: <HardDrive />,
                  value: row.original.modelParameters,
                  content: 'Parameters',
                },

                {
                  icon: <Cpu />,
                  value: row.original.modelArchitecture,
                  content: 'Architecture',
                },
              ].map(({ icon, value, content }, index) => {
                if (!value) return null;

                const Children = (
                  <div
                    className={clsx(
                      'flex w-fit items-center gap-1 whitespace-nowrap text-xs leading-4 text-gray-11',
                      content
                        ? 'underline decoration-dotted transition-colors hover:text-gray-12'
                        : '',
                    )}
                    key={index}
                  >
                    <span className="flex size-3 items-center justify-center">{icon}</span>
                    <span>{value}</span>
                  </div>
                );

                if (content) {
                  return (
                    <ClickableTooltip key={index} content={content}>
                      {Children}
                    </ClickableTooltip>
                  );
                }

                return <Fragment key={index}>{Children}</Fragment>;
              })}
            </div>
          </div>
        ),
      },
      {
        id: 'device',
        accessorKey: 'deviceCpu',
        header: () => 'Device',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="line-clamp-1">{row.original.deviceCpu ?? row.original.deviceGpu}</span>
            <div className="mt-0 flex h-4 gap-2">
              {[
                {
                  icon: <Cpu />,
                  value: Number(row.original.deviceCpuCores).toLocaleString(),
                  content: 'CPU cores',
                },
                {
                  icon: <Gpu />,
                  value: Number(row.original.deviceGpuCores).toLocaleString(),
                  content: 'GPU cores',
                },
                {
                  icon: <MemoryStick />,
                  value: `${Number(row.original.deviceRamGb).toLocaleString()} GB`,
                  content: 'RAM',
                },
              ].map(({ icon, value, content }, index) => {
                if (!value) return null;

                const Children = (
                  <div
                    className={clsx(
                      'flex w-fit items-center gap-1 whitespace-nowrap text-xs leading-4 text-gray-11',
                      content
                        ? 'underline decoration-dotted transition-colors hover:text-gray-12'
                        : '',
                    )}
                    key={index}
                  >
                    <span className="flex size-3 items-center justify-center">{icon}</span>
                    <span>{value}</span>
                  </div>
                );

                if (content) {
                  return (
                    <ClickableTooltip key={index} content={content}>
                      {Children}
                    </ClickableTooltip>
                  );
                }

                return <Fragment key={index}>{Children}</Fragment>;
              })}
            </div>
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
        header: ({ column }) => (
          <DataTableSortHeader className="ml-auto w-fit" column={column}>
            Decode
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.avgDecodeTps).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-gray-11">tps</span>
          </div>
        ),
      },
      {
        id: 'prefill',
        accessorKey: 'avgPrefillTps',
        header: ({ column }) => (
          <DataTableSortHeader className="ml-auto w-fit" column={column}>
            Prefill
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.avgPrefillTps).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-gray-11">tps</span>
          </div>
        ),
      },
      {
        id: 'ttft_p50',
        accessorKey: 'ttftP50Ms',
        header: () => <div className="text-right">TTFT</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.ttftP50Ms).toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
            <span className="text-gray-11">ms</span>
          </div>
        ),
      },
      {
        id: 'peak_rss',
        accessorKey: 'avgPeakRssMb',
        header: () => <div className="text-right">Memory</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.avgPeakRssMb).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
        ),
      },
      {
        id: 'trials',
        accessorKey: 'trials',
        header: () => <div className="text-right">Trials</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {Number(row.original.trialCount).toLocaleString()}
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
