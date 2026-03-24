'use client';

import { Fragment, useMemo } from 'react';

import type { ModelsDataTableInternalProps } from '.';
import type { ModelsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { ChevronRight, FileText } from 'lucide-react';

import StateInfo from '@/components/templates/state-info';
import { Button, IconButton, Table, Tooltip } from '@/components/ui';

const ModelsDataTableMobile: React.FC<ModelsDataTableInternalProps> = (tableOptions) => {
  const columns: ColumnDef<ModelsDataTableValue>[] = useMemo(
    () => [
      {
        id: 'model',
        accessorKey: 'modelDisplayName',
        header: () => 'Model',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="line-clamp-1 font-medium">{row.original.modelDisplayName}</span>
            <span className="text-xs text-gray-11">
              {row.original.modelQuant} · {row.original.runtimeName}
            </span>
          </div>
        ),
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
        id: 'action',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="ml-auto w-fit">
            <Tooltip content="Expand row" triggerProps={{ asChild: true }}>
              <IconButton
                variant="outline"
                onClick={() => row.toggleExpanded()}
                aria-label="Expand row."
              >
                <ChevronRight
                  className={clsx(
                    'transition-transform',
                    row.getIsExpanded() ? 'rotate-90' : 'rotate-0',
                  )}
                />
              </IconButton>
            </Tooltip>
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
    <Table.Root containerClassName="w-full md:hidden hide-scrollbar -mx-4 w-[calc(100%+2rem)]">
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <Table.Head
                  key={header.id}
                  colSpan={header.colSpan}
                  className="first:pl-4 last:pr-4"
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
              <Fragment key={row.id}>
                <Table.Row
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="h-16"
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id} className="first:pl-4 last:pr-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
                {row.getIsExpanded() ? (
                  <Table.Row isSubComponent>
                    <Table.Cell colSpan={row.getVisibleCells().length}>
                      <ModelsDataTableMobileSubComponent data={row.original} />
                    </Table.Cell>
                  </Table.Row>
                ) : null}
              </Fragment>
            ) : (
              <Table.Row key={row.id}>
                {[
                  <div key={0} className="ml-auto w-8">
                    <IconButton variant="outline" disabled>
                      <ChevronRight />
                    </IconButton>
                  </div>,
                ].map((skeleton, i) => (
                  <Table.Cell key={i} className="first:pl-4 last:pr-4">
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
                title="No users yet"
                description="Be the first to submit a prompt."
                icon={<FileText />}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  intent="info"
                  href="/"
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

const ModelsDataTableMobileSubComponent: React.FC<{ data: ModelsDataTableValue }> = ({ data }) => {
  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      {[
        { label: 'Device', value: data.deviceCpu ?? data.deviceGpu },
        { label: 'OS / RAM', value: `${data.deviceOsName} · ${data.deviceRamGb} GB` },
        { label: 'Format', value: data.modelFormat },
        { label: 'Params', value: data.modelParameters },
        { label: 'Prefill (tok/s)', value: Number(data.avgPrefillTps).toFixed(1) },
        { label: 'TTFT p50 (ms)', value: Number(data.ttftP50Ms).toFixed(0) },
        { label: 'TTFT p95 (ms)', value: Number(data.ttftP95Ms).toFixed(0) },
        { label: 'Peak RSS (MB)', value: Number(data.avgPeakRssMb).toFixed(0) },
        { label: 'Runs', value: data.runCount },
      ].map(({ label, value }) => (
        <div key={label} className="flex flex-col items-start gap-0.5">
          <span className="text-xs leading-4 text-gray-11">{label}</span>
          <span className="text-sm tabular-nums leading-[1.125rem]">{value}</span>
        </div>
      ))}
    </div>
  );
};

export default ModelsDataTableMobile;
