'use client';

import { Fragment, useCallback, useMemo, useState } from 'react';

import type { ModelsDataTableInternalProps } from '.';
import CopyCommandButton from './copy-command-button';
import type { ModelsDataTableValue } from './types';
import { type ColumnDef, flexRender, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { Check, ChevronRight, Copy, FileText, Info } from 'lucide-react';

import { RUN_COMMAND } from '@/lib/constants/cli';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import DataTableSortHeader from '@/components/templates/data-table-sort-header';
import ScoreBadge from '@/components/templates/score-badge';
import Stat from '@/components/templates/stat';
import StateInfo from '@/components/templates/state-info';
import { ModelTableCell, RuntimeTableCell } from '@/components/templates/table-cells';
import { Button, IconButton, Table, toast, Tooltip } from '@/components/ui';

const ModelsDataTableMobile: React.FC<ModelsDataTableInternalProps> = (tableOptions) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyCommand = useCallback(() => {
    if (copied) return;
    navigator.clipboard.writeText(RUN_COMMAND);
    setCopied(true);
    toast({
      title: 'Copied command to clipboard.',
      description: <span className="select-all font-mono">{RUN_COMMAND}</span>,
      intent: 'success',
      hasCloseButton: true,
    });
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
            source={row.original.modelSource}
            runtimeName={row.original.runtimeName}
            fileSizeBytes={row.original.modelFileSizeBytes}
            lab={
              row.original.labName && row.original.labSlug
                ? {
                    name: row.original.labName,
                    logoUrl: row.original.labLogoUrl,
                    websiteUrl: row.original.labWebsiteUrl,
                    slug: row.original.labSlug,
                  }
                : undefined
            }
            quantizedBy={
              row.original.quantizedByName
                ? {
                    name: row.original.quantizedByName,
                    logoUrl: row.original.quantizedByLogoUrl,
                    websiteUrl: row.original.quantizedByWebsiteUrl,
                  }
                : undefined
            }
            labSlug={row.original.labSlug}
            familySlug={row.original.familySlug}
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
        id: 'score',
        accessorKey: 'compositeScore',
        header: ({ column }) => (
          <DataTableSortHeader
            className="ml-auto w-fit"
            column={column}
            description={
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-12">Score</span>
                <span className="text-xs leading-normal text-gray-11">
                  Weighted blend of decode/prefill throughput and memory usage.
                </span>
              </div>
            }
          >
            Score
          </DataTableSortHeader>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ScoreBadge score={row.original.compositeScore} />
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
        <Stat.Name className="w-fit transition-colors hover:text-gray-12">
          <ClickableTooltip
            content={
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-12">Time to first token</span>
                <span className="text-xs leading-normal text-gray-11">
                  p50 time taken to generate the first output token.
                </span>
              </div>
            }
          >
            <div className="flex items-center gap-1">
              <span className="leading-4">TTFT</span>
              <Info className="size-3" />
            </div>
          </ClickableTooltip>
        </Stat.Name>
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
        {data.avgPeakRssMb ? (
          <Stat.Value className="tabular-nums">
            {Number(data.avgPeakRssMb / 1024).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-gray-11">GB</span>{' '}
            <span className="text-gray-11">
              ({((data.avgPeakRssMb / 1024 / data.deviceRamGb) * 100).toFixed(2)}%)
            </span>
          </Stat.Value>
        ) : (
          <Stat.Value empty>N/A</Stat.Value>
        )}
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Trials</Stat.Name>
        <Stat.Value className="tabular-nums">{Number(data.trialCount).toLocaleString()}</Stat.Value>
      </Stat>
      <Stat className="col-span-1">
        <Stat.Name>Runs</Stat.Name>
        <Stat.Value className="tabular-nums">{Number(data.runCount).toLocaleString()}</Stat.Value>
      </Stat>
      <CopyCommandButton className="col-span-2 w-full" row={data} iconButton={false} />
    </div>
  );
};

export default ModelsDataTableMobile;
