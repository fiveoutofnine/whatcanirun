'use client';

import { Fragment, useMemo } from 'react';

import type { RunsDataTableInternalProps } from '.';
import type { RunsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { ChevronRight, FileText } from 'lucide-react';

import { getVramGb, MANUFACTURER_LABEL } from '@/lib/constants/gpu';
import { RunStatus } from '@/lib/db/schema';
import { parseManufacturer } from '@/lib/utils';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import RelativeDate from '@/components/templates/relative-date';
import Stat from '@/components/templates/stat';
import StateInfo from '@/components/templates/state-info';
import { ModelTableCell, RuntimeTableCell } from '@/components/templates/table-cells';
import { Badge, IconButton, Table, Tooltip } from '@/components/ui';

const STATUS_BADGE_INTENT = {
  [RunStatus.VERIFIED]: 'success',
  [RunStatus.PENDING]: 'warning',
  [RunStatus.FLAGGED]: 'orange',
  [RunStatus.REJECTED]: 'fail',
} as const;

const RunsDataTableMobile: React.FC<RunsDataTableInternalProps> = (tableOptions) => {
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
                      <RunsDataTableMobileSubComponent data={row.original} />
                    </Table.Cell>
                  </Table.Row>
                ) : null}
              </Fragment>
            ) : (
              <Table.Row key={row.id} className="h-16">
                {[
                  <ModelTableCell.Skeleton key={0} />,
                  <div
                    key={1}
                    className="ml-auto h-[1.125rem] w-20 animate-pulse rounded bg-gray-9"
                  />,
                  <div key={2} className="ml-auto h-5 w-16 animate-pulse rounded-full bg-gray-9" />,
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

const RunsDataTableMobileSubComponent: React.FC<{ data: RunsDataTableValue }> = ({ data }) => {
  const { device } = data;
  const hasGpu = device.gpuCount > 0;
  const gpuCount = device.gpuCount ?? 1;
  const devicePrimaryName = hasGpu ? device.gpu : device.cpu;
  const { manufacturer, displayName, logo: Icon } = parseManufacturer(devicePrimaryName);
  const countPrefix = manufacturer !== 'apple' && gpuCount > 1 ? `${gpuCount}×` : '';
  const vram = getVramGb(device.gpu);
  const totalVram = vram != null ? vram * gpuCount : null;

  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      <Stat className="col-span-2">
        <Stat.Name>Device</Stat.Name>
        <Stat.Value className="flex items-center gap-1.5">
          {countPrefix}
          {displayName}{' '}
          {manufacturer && Icon ? (
            <ClickableTooltip
              content={MANUFACTURER_LABEL[manufacturer]}
              triggerProps={{ className: 'rounded' }}
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded">
                <Icon className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
              </span>
            </ClickableTooltip>
          ) : null}
        </Stat.Value>
      </Stat>
      {manufacturer === 'apple' ? (
        <Fragment>
          <Stat className="col-span-1">
            <Stat.Name>CPU/GPU cores</Stat.Name>
            <Stat.Value className="tabular-nums">
              {device.cpuCores}
              <span className="text-gray-11"> / </span>
              {device.gpuCores}
            </Stat.Value>
          </Stat>
          <Stat className="col-span-1">
            <Stat.Name>RAM</Stat.Name>
            <Stat.Value className="tabular-nums">{device.ramGb} GB</Stat.Value>
          </Stat>
        </Fragment>
      ) : hasGpu ? (
        <Stat className="col-span-2">
          <Stat.Name>VRAM</Stat.Name>
          {totalVram ? (
            <Stat.Value className="tabular-nums">{totalVram} GB</Stat.Value>
          ) : (
            <Stat.Value empty>Unknown</Stat.Value>
          )}
        </Stat>
      ) : (
        <Fragment>
          <Stat className="col-span-1">
            <Stat.Name>CPU cores</Stat.Name>
            <Stat.Value className="tabular-nums">{device.cpuCores}</Stat.Value>
          </Stat>
          <Stat className="col-span-1">
            <Stat.Name>RAM</Stat.Name>
            <Stat.Value className="tabular-nums">{device.ramGb} GB</Stat.Value>
          </Stat>
        </Fragment>
      )}
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
            ({((data.peakRssMb / 1024 / device.ramGb) * 100).toFixed(2)}%)
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
        <Stat.Name>Status</Stat.Name>
        <Badge variant="outline" size="sm" type="text" intent={STATUS_BADGE_INTENT[data.status]}>
          {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </Badge>
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

export default RunsDataTableMobile;
