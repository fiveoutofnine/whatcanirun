import clsx from 'clsx';
import { FileQuestionMark } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import type { Run } from '@/lib/db/schema';

import LogoImg from '@/components/common/logo-img';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type RuntimeTableCellProps = Pick<Run, 'runtimeName'> & {
  className?: string;
  runtimeVersion?: string;
  align?: 'left' | 'right';
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

type RuntimeTableCellSkeletonProps = {
  showVersion?: boolean;
};

const RuntimeTableCell: React.FC<RuntimeTableCellProps> & {
  Skeleton: React.FC<RuntimeTableCellSkeletonProps>;
} = ({ className, runtimeName, runtimeVersion, align = 'left' }) => {
  let url;
  let Icon;
  if (runtimeName === 'llama.cpp') {
    url = 'https://github.com/ggerganov/llama.cpp';
    Icon = LogoImg.Ggml;
  } else if (runtimeName === 'mlx_lm') {
    url = 'https://github.com/ml-explore/mlx-lm';
    Icon = LogoImg.Mlx;
  }

  const content =
    url && Icon ? (
      <a
        className={twMerge(
          clsx(
            'group/runtime-table-cell flex w-fit items-center gap-1.5 hover:underline focus-visible:rounded',
            className,
          ),
        )}
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        <span
          className="flex size-4 items-center justify-center rounded"
          runtime-table-cell-icon=""
        >
          <Icon
            className="border-gray-7 transition-colors group-hover/runtime-table-cell:border-gray-8"
            size={16}
          />
        </span>
        <span className="line-clamp-1 leading-5" runtime-table-cell-name="">
          {runtimeName}
        </span>
      </a>
    ) : (
      <div className={twMerge(clsx('flex items-center gap-1.5', className))}>
        <span
          className="flex size-4 items-center justify-center rounded border border-gray-6 bg-gray-5 text-gray-11"
          runtime-table-cell-icon=""
        >
          <FileQuestionMark className="size-2.5" />
        </span>
        <span className="line-clamp-1 leading-5" runtime-table-cell-name="">
          {runtimeName}
        </span>
      </div>
    );

  if (runtimeVersion) {
    return (
      <div
        className={clsx(
          'flex flex-col',
          align === 'right'
            ? 'items-end'
            : '[&_[runtime-table-cell-version]]:pl-[1.375rem]] items-start',
        )}
      >
        {content}
        <span className="text-xs tabular-nums leading-4 text-gray-11" runtime-table-cell-version="">
          {runtimeVersion}
        </span>
      </div>
    );
  }

  return content;
};

const RuntimeTableCellSkeleton: React.FC<RuntimeTableCellSkeletonProps> = ({
  showVersion = false,
}) => {
  const content = (
    <div className="flex items-center gap-1.5">
      <div className="size-4 animate-pulse rounded bg-gray-9" runtime-table-cell-icon="" />
      <div
        className="h-[1.125rem] w-16 animate-pulse rounded bg-gray-9"
        runtime-table-cell-name=""
      />
    </div>
  );

  if (showVersion) {
    return (
      <div className="flex flex-col items-start gap-0.5 [&_[runtime-table-cell-version]]:pl-[1.375rem]">
        {content}
        <div className="h-4 w-10 animate-pulse rounded bg-gray-9" runtime-table-cell-version="" />
      </div>
    );
  }

  return content;
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

RuntimeTableCell.Skeleton = RuntimeTableCellSkeleton;

export default RuntimeTableCell;
