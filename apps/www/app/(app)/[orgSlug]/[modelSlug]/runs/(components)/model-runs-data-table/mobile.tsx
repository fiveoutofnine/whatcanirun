'use client';

import { Fragment, useMemo } from 'react';

import type { ModelRunsDataTableInternalProps } from '.';
import type { ModelRunsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { ChevronRight, FileText } from 'lucide-react';

import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import RelativeDate from '@/components/templates/relative-date';
import Stat from '@/components/templates/stat';
import StateInfo from '@/components/templates/state-info';
import {
  DeviceTableCell,
  QuantTableCell,
  RuntimeTableCell,
} from '@/components/templates/table-cells';
import { IconButton, Table, Tooltip } from '@/components/ui';

const ModelRunsDataTableMobile: React.FC<ModelRunsDataTableInternalProps> = (tableOptions) => {
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
    <Table.Root containerClassName="w-full md:hidden hide-scrollbar">
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
                      <ModelRunsDataTableMobileSubComponent data={row.original} />
                    </Table.Cell>
                  </Table.Row>
                ) : null}
              </Fragment>
            ) : (
              <Table.Row key={row.id} className="h-16">
                {[
                  <DeviceTableCell.Skeleton key={0} />,
                  <QuantTableCell.Skeleton key={1} />,
                  <div
                    key={2}
                    className="ml-auto h-[1.125rem] w-20 animate-pulse rounded bg-gray-9"
                  />,
                  <div key={3} className="ml-auto w-8">
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

const ModelRunsDataTableMobileSubComponent: React.FC<{ data: ModelRunsDataTableValue }> = ({
  data,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      <Stat className="col-span-1">
        <Stat.Name>Runtime</Stat.Name>
        <RuntimeTableCell
          className="[&_[runtime-table-cell-icon]]:order-last [&_[runtime-table-cell-version]]:pl-0"
          runtimeName={data.runtimeName}
        />
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Runtime version</Stat.Name>
        <Stat.Value className="tabular-nums">{data.runtimeVersion}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Prompt tokens</Stat.Name>
        <Stat.Value className="tabular-nums">
          {(data.promptTokens ?? 0).toLocaleString()}
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Generation tokens</Stat.Name>
        <Stat.Value className="tabular-nums">
          {(data.completionTokens ?? 0).toLocaleString()}
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Prefill</Stat.Name>
        <Stat.Value className="tabular-nums">
          {data.prefillTpsMean != null
            ? `${Number(data.prefillTpsMean).toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })} `
            : '— '}
          <span className="text-gray-11">tok/s</span>
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Peak memory</Stat.Name>
        <Stat.Value className="tabular-nums">
          {Number(data.peakRssMb / 1024).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          <span className="text-gray-11">GB</span>{' '}
          <span className="text-gray-11">
            ({((data.peakRssMb / 1024 / data.device.ramGb) * 100).toFixed(2)}%)
          </span>
        </Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Trials passed</Stat.Name>
        <Stat.Value className="tabular-nums">{data.trialsPassed}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Trials total</Stat.Name>
        <Stat.Value className="tabular-nums">{data.trialsTotal}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Date</Stat.Name>
        <RelativeDate
          className="min-w-fit text-nowrap"
          date={data.createdAt}
          type="relative"
          clickable
        />
      </Stat>
    </div>
  );
};

export default ModelRunsDataTableMobile;
