'use client';

import { useState } from 'react';

import clsx from 'clsx';
import { ArrowUpRight, Check, Copy, ExternalLink } from 'lucide-react';

import type { Organization } from '@/lib/db/schema';
import { formatBytes } from '@/lib/utils';

import LogoImg from '@/components/common/logo-img';
import { Code } from '@/components/templates/mdx';
import ScoreBadge from '@/components/templates/score-badge';
import UserAvatar from '@/components/templates/user-avatar';
import { Table, toast, Tooltip } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export type Quant = {
  modelId: string;
  quant: string | null;
  format: string;
  fileSizeBytes: number | null;
  source: string | null;
  quantizedBy: Organization | null;
  score: number | null;
};

type ModelQuantizationsTableProps = {
  quants: Quant[];
  loading?: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelQuantizationsTable: React.FC<ModelQuantizationsTableProps> = ({ quants, loading }) => {
  return (
    <Table.Root
      containerClassName={clsx(
        'rounded-none border-y md:border-x border-gray-6 md:rounded-xl hide-scrollbar',
        '[&>table]:border-0',
      )}
    >
      <Table.Header>
        <Table.Row>
          <Table.Head className="pl-4">Quant</Table.Head>
          <Table.Head>Quantized by</Table.Head>
          <Table.Head>Size</Table.Head>
          <Table.Head>Runnability</Table.Head>
          <Table.Head className="pr-4 text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {quants.map((v) => {
          if (!v.quant) return null;

          let sourceUrl;
          let formatUrl;
          let Icon;
          if (v.format === 'gguf') {
            if (v.source) {
              const sourceParts = v.source.split(':') ?? [];
              if (sourceParts.length > 1) {
                sourceUrl = `https://huggingface.co/${sourceParts[0]}/blob/main/${sourceParts[1]}`;
              }
            }
            formatUrl = 'https://huggingface.co/docs/hub/gguf';
            Icon = LogoImg.Ggml;
          } else if (v.format === 'mlx') {
            if (v.source) sourceUrl = `https://huggingface.co/${v.source}`;
            formatUrl = 'https://github.com/ml-explore/mlx';
            Icon = LogoImg.Mlx;
          }
          const [sizeValue, sizeUnit] = formatBytes(v.fileSizeBytes ?? 0).split(' ');

          return (
            <Table.Row key={v.modelId}>
              <Table.Cell className="pl-4">
                <div className="flex min-w-fit items-center gap-1.5 text-nowrap">
                  {sourceUrl ? (
                    <a
                      className="flex hover:underline focus-visible:rounded"
                      href={sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {v.quant}
                      <ArrowUpRight className="size-3 text-gray-11" />
                    </a>
                  ) : (
                    <span>{v.quant}</span>
                  )}
                  {formatUrl && Icon ? (
                    <Tooltip
                      content={
                        <span>
                          <Code>{v.format}</Code> format
                        </span>
                      }
                      triggerProps={{
                        className:
                          'focus-visible:rounded group/quant-format size-4 overflow-hidden border rounded border-gray-7 transition-colors hover:border-gray-8',
                        asChild: true,
                      }}
                      inverted={false}
                    >
                      <a
                        className="relative flex items-center justify-center"
                        href={formatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon
                          className="rounded-none border-0 transition-[filter] group-hover/quant-format:blur group-focus-visible/quant-format:blur"
                          size={16}
                        />
                        <ExternalLink className="pointer-events-none absolute size-2.5 opacity-0 transition-opacity group-hover/quant-format:opacity-100 group-focus-visible/quant-format:opacity-100" />
                      </a>
                    </Tooltip>
                  ) : (
                    <Code>{v.format}</Code>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>
                {v.quantizedBy ? (
                  v.quantizedBy.websiteUrl ? (
                    <a
                      className="flex w-fit min-w-fit items-center gap-1.5 text-nowrap hover:underline focus-visible:rounded"
                      href={v.quantizedBy.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <UserAvatar
                        image={v.quantizedBy.logoUrl}
                        name={v.quantizedBy.name}
                        size={18}
                      />
                      <span className="flex text-sm text-gray-12">
                        {v.quantizedBy.name}
                        <ArrowUpRight className="size-3 text-gray-11" />
                      </span>
                    </a>
                  ) : (
                    <div className="flex min-w-fit items-center gap-1.5 text-nowrap">
                      <UserAvatar
                        image={v.quantizedBy.logoUrl}
                        name={v.quantizedBy.name}
                        size={18}
                      />
                      <span className="text-sm text-gray-12">{v.quantizedBy.name}</span>
                    </div>
                  )
                ) : (
                  <span className="italic text-gray-11">Unknown</span>
                )}
              </Table.Cell>
              <Table.Cell className="min-w-fit text-nowrap">
                <span className="tabular-nums text-gray-12">{sizeValue}</span>
                <span className="text-gray-11"> {sizeUnit}</span>
              </Table.Cell>
              <Table.Cell>
                {loading ? (
                  <div className="h-5 w-16 animate-pulse rounded-full bg-gray-9" />
                ) : v.score != null ? (
                  <ScoreBadge score={v.score} />
                ) : (
                  <span className="italic text-gray-11">N/A</span>
                )}
              </Table.Cell>
              <Table.Cell className="flex tabular-nums text-gray-12">
                <div className="ml-auto w-fit">
                  {v.source ? (
                    <ModelQuantizationsTableCopyButton source={v.source} format={v.format} />
                  ) : (
                    <span className="italic text-gray-11">N/A</span>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
};

const ModelQuantizationsTableCopyButton: React.FC<{ source: string; format: string }> = ({
  source,
  format,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  let runtimeName;
  if (format === 'gguf') runtimeName = 'llama.cpp';
  else if (format === 'mlx') runtimeName = 'mlx_lm';
  else return null;

  const copy = () => {
    if (copied) return;

    const command = `npx whatcanirun@latest run --model ${source} --runtime ${runtimeName} --submit`;
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast({
      title: 'Copied command to clipboard.',
      description: <span className="select-all font-mono">{command}</span>,
      intent: 'success',
      hasCloseButton: true,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Tooltip
      content="Copy command to run the benchmark"
      side="left"
      inverted={false}
      triggerProps={{ asChild: true }}
    >
      <button
        className="flex items-center gap-1.5 text-sm text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12 focus-visible:rounded"
        onClick={copy}
      >
        <span>Run</span>
        {copied ? (
          <Check className="size-3.5 animate-in fade-in zoom-in" />
        ) : (
          <Copy className="size-3.5 animate-in fade-in" />
        )}
      </button>
    </Tooltip>
  );
};

export default ModelQuantizationsTable;
