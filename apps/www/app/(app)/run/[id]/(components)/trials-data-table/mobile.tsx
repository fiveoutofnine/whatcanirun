'use client';

import { Fragment, useMemo } from 'react';

import type { TrialsDataTableInternalProps } from '.';
import type { TrialsDataTableValue } from './types';
import { formatDuration, formatGb, formatNumber, formatPercent } from './utils';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { ChevronRight, FileText } from 'lucide-react';

import Stat from '@/components/templates/stat';
import StateInfo from '@/components/templates/state-info';
import { IconButton, Table, Tooltip } from '@/components/ui';

const TrialsDataTableMobile: React.FC<TrialsDataTableInternalProps> = (tableOptions) => {
  const columns: ColumnDef<TrialsDataTableValue>[] = useMemo(
    () => [
      {
        id: 'index',
        header: () => 'Trial',
        cell: ({ row }) => <div className="tabular-nums">#{row.original.trialIndex + 1}</div>,
      },
      {
        id: 'decode',
        accessorKey: 'decodeTps',
        header: () => <div className="flex justify-end">Decode</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatNumber(row.original.decodeTps)} <span className="text-gray-11">tok/s</span>
          </div>
        ),
      },
      {
        id: 'memory',
        accessorKey: 'peakRssMb',
        header: () => <div className="flex justify-end">Peak RSS</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatGb(row.original.peakRssMb)} <span className="text-gray-11">GB</span>
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
                aria-label="Expand row."
                onClick={() => row.toggleExpanded()}
                variant="outline"
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
    <Table.Root containerClassName="hide-scrollbar -mx-4 w-[calc(100%+2rem)] md:hidden">
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id} colSpan={header.colSpan} className="first:pl-4 last:pr-4">
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
            <Fragment key={row.id}>
              <Table.Row className="h-16" data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell key={cell.id} className="first:pl-4 last:pr-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
              {row.getIsExpanded() ? (
                <Table.Row isSubComponent>
                  <Table.Cell colSpan={row.getVisibleCells().length}>
                    <TrialsDataTableMobileSubComponent data={row.original} />
                  </Table.Cell>
                </Table.Row>
              ) : null}
            </Fragment>
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

const TrialsDataTableMobileSubComponent: React.FC<{ data: TrialsDataTableValue }> = ({ data }) => {
  const peakMemoryUsedGb = data.peakRssMb / 1024;

  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      <Stat className="col-span-1">
        <Stat.Name>Input</Stat.Name>
        <Stat.Value className="tabular-nums">{data.inputTokens.toLocaleString()}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Output</Stat.Name>
        <Stat.Value className="tabular-nums">{data.outputTokens.toLocaleString()}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>TTFT</Stat.Name>
        <Stat.Value className="tabular-nums">{formatDuration(data.ttftMs)}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Total</Stat.Name>
        <Stat.Value className="tabular-nums">{formatDuration(data.totalMs)}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Prefill</Stat.Name>
        <Stat.Value className="tabular-nums">
          {formatNumber(data.prefillTps)} <span className="text-gray-11">tok/s</span>
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Decode</Stat.Name>
        <Stat.Value className="tabular-nums">
          {formatNumber(data.decodeTps)} <span className="text-gray-11">tok/s</span>
        </Stat.Value>
      </Stat>
      <Stat className="col-span-2">
        <Stat.Name>Peak memory</Stat.Name>
        <Stat.Value className="tabular-nums">
          {formatGb(data.peakRssMb)} <span className="text-gray-11">GB</span>{' '}
          <span className="text-gray-11">
            ({formatPercent(peakMemoryUsedGb / data.deviceRamGb)})
          </span>
        </Stat.Value>
      </Stat>
    </div>
  );
};

export default TrialsDataTableMobile;
