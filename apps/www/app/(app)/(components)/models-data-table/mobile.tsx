'use client';

import { Fragment, useCallback, useMemo, useState } from 'react';

import type { ModelsDataTableInternalProps } from '.';
import type { ModelsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { Check, ChevronRight, Copy, FileText } from 'lucide-react';

import { RUN_AND_SUBMIT_COMMAND } from '@/lib/constants/cli';

import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import Stat from '@/components/templates/stat';
import StateInfo from '@/components/templates/state-info';
import { ModelTableCell, RuntimeTableCell } from '@/components/templates/table-cells';
import { Button, IconButton, Table, toast, Tooltip } from '@/components/ui';

const ModelsDataTableMobile: React.FC<ModelsDataTableInternalProps> = (tableOptions) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyCommand = useCallback(() => {
    if (copied) return;
    navigator.clipboard.writeText(RUN_AND_SUBMIT_COMMAND);
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
          <div className="min-w-fit text-nowrap text-right tabular-nums">
            {Number(row.original.avgDecodeTps).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-gray-11">tok/s</span>
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
                  <ModelTableCell.Skeleton key={0} />,
                  <div
                    key={1}
                    className="ml-auto h-[1.125rem] w-20 animate-pulse rounded bg-gray-9"
                  />,
                  <div key={2} className="ml-auto w-8">
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
                  Copy command
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
      <Stat className="col-span-2">
        <Stat.Name>Device</Stat.Name>
        <Stat.Value>{data.deviceCpu ?? data.deviceGpu}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>CPU/GPU cores</Stat.Name>
        <Stat.Value className="tabular-nums">
          {data.deviceCpuCores}
          <span className="text-gray-11"> / </span>
          {data.deviceGpuCores}
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>RAM</Stat.Name>
        <Stat.Value className="tabular-nums">{data.deviceRamGb} GB</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Runtime</Stat.Name>
        <RuntimeTableCell
          className="[&_[runtime-table-cell-icon]]:order-last"
          runtimeName={data.runtimeName}
        />
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Prefill</Stat.Name>
        <Stat.Value className="tabular-nums">
          {Number(data.avgPrefillTps).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}{' '}
          <span className="text-gray-11">tok/s</span>
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>TTFT</Stat.Name>
        {data.ttftP50Ms < 4_000 ? (
          <Stat.Value className="tabular-nums">
            {Number(data.ttftP50Ms).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-gray-11">ms</span>
          </Stat.Value>
        ) : (
          <Stat.Value className="tabular-nums">
            {Number(data.ttftP50Ms / 1_000).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-gray-11">sec</span>
          </Stat.Value>
        )}
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Peak memory</Stat.Name>
        <Stat.Value className="tabular-nums">
          {Number(data.avgPeakRssMb / 1024).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          <span className="text-gray-11">GB</span>
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Trials</Stat.Name>
        <Stat.Value className="tabular-nums">{Number(data.trialCount).toLocaleString()}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Runs</Stat.Name>
        <Stat.Value className="tabular-nums">{Number(data.runCount).toLocaleString()}</Stat.Value>
      </Stat>
    </div>
  );
};

export default ModelsDataTableMobile;
