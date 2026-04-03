import clsx from 'clsx';
import { ArrowUpRight, ExternalLink } from 'lucide-react';

import { formatBytes } from '@/lib/utils';

import LogoImg from '@/components/common/logo-img';
import { Code } from '@/components/templates/mdx';
import UserAvatar from '@/components/templates/user-avatar';
import { Table, Tooltip } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export type QuantizationVariant = {
  modelId: string;
  quant: string | null;
  format: string;
  fileSizeBytes: number | null;
  source: string | null;
  quantizedBy: {
    name: string;
    logoUrl: string | null;
  } | null;
  totalTrials: number;
  deviceCount: number;
};

type ModelQuantizationsTableProps = {
  variants: QuantizationVariant[];
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelQuantizationsTable: React.FC<ModelQuantizationsTableProps> = ({ variants }) => {
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
          <Table.Head>Trials</Table.Head>
          <Table.Head className="pr-4">Devices</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {variants.map((v) => {
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
                  <div className="flex min-w-fit items-center gap-1.5 text-nowrap">
                    <UserAvatar image={v.quantizedBy.logoUrl} name={v.quantizedBy.name} size={18} />
                    <span className="text-sm text-gray-12">{v.quantizedBy.name}</span>
                  </div>
                ) : (
                  <span className="italic text-gray-11">Unknown</span>
                )}
              </Table.Cell>
              <Table.Cell>
                <span className="tabular-nums text-gray-12">{sizeValue}</span>
                <span className="text-gray-11"> {sizeUnit}</span>
              </Table.Cell>
              <Table.Cell className="tabular-nums text-gray-12">
                {v.totalTrials.toLocaleString()}
              </Table.Cell>
              <Table.Cell className="pr-4 tabular-nums text-gray-12">
                {v.deviceCount.toLocaleString()}
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
};

export default ModelQuantizationsTable;
