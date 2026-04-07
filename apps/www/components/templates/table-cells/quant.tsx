import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import LogoImg from '@/components/common/logo-img';
import { Code } from '@/components/templates/mdx';
import { Tooltip } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type QuantTableCellProps = {
  quant: string | null;
  format: string;
  source: string | null;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const QuantTableCell: React.FC<QuantTableCellProps> & { Skeleton: React.FC } = ({
  quant,
  format,
  source,
}) => {
  if (!quant) return <span className="text-gray-11">—</span>;

  let sourceUrl: string | undefined;
  let formatUrl: string | undefined;
  let Icon: typeof LogoImg.Ggml | undefined;

  if (format === 'gguf') {
    if (source) {
      const parts = source.split(':') ?? [];
      if (parts.length > 1) {
        sourceUrl = `https://huggingface.co/${parts[0]}/blob/main/${parts[1]}`;
      }
    }
    formatUrl = 'https://huggingface.co/docs/hub/gguf';
    Icon = LogoImg.Ggml;
  } else if (format === 'mlx') {
    if (source) sourceUrl = `https://huggingface.co/${source}`;
    formatUrl = 'https://github.com/ml-explore/mlx';
    Icon = LogoImg.Mlx;
  }

  return (
    <div className="flex min-w-fit items-center gap-1.5 text-nowrap">
      {sourceUrl ? (
        <a
          className="flex hover:underline focus-visible:rounded"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {quant}
          <ArrowUpRight className="size-3 text-gray-11" />
        </a>
      ) : (
        <span>{quant}</span>
      )}
      {formatUrl && Icon ? (
        <Tooltip
          content={
            <span>
              <Code>{format}</Code> format
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
        <Code>{format}</Code>
      )}
    </div>
  );
};

const QuantTableCellSkeleton: React.FC = () => {
  return (
    <div className="flex min-w-fit items-center gap-1.5">
      <span className={twMerge('h-[1.125rem] w-12 animate-pulse rounded bg-gray-9')} />
      <span className="size-4 animate-pulse rounded border border-gray-7 bg-gray-9" />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

QuantTableCell.Skeleton = QuantTableCellSkeleton;

export default QuantTableCell;
