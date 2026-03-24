import clsx from 'clsx';
import { FileQuestionMark } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import type { Run } from '@/lib/db/schema';

import LogoImg from '@/components/common/logo-img';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type RuntimeTableCellProps = Pick<Run, 'runtimeName'> & { className?: string };

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const RuntimeTableCell: React.FC<RuntimeTableCellProps> & { Skeleton: React.FC } = ({
  className,
  runtimeName,
}) => {
  return (
    <div className={twMerge(clsx('flex items-center gap-1.5', className))}>
      {runtimeName === 'llama.cpp' ? (
        <a
          className="focus-visible:rounded"
          href="https://github.com/ggerganov/llama.cpp"
          target="_blank"
          rel="noreferrer"
          runtime-table-cell-icon=""
        >
          <LogoImg.Ggml className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
        </a>
      ) : runtimeName === 'mlx_lm' ? (
        <a
          className="focus-visible:rounded"
          href="https://github.com/ml-explore/mlx-lm"
          target="_blank"
          rel="noreferrer"
          runtime-table-cell-icon=""
        >
          <LogoImg.Mlx className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
        </a>
      ) : (
        <span
          className="flex size-4 items-center justify-center rounded border border-gray-6 bg-gray-5 text-gray-11"
          runtime-table-cell-icon=""
        >
          <FileQuestionMark className="size-2.5" />
        </span>
      )}
      <span className="line-clamp-1 leading-4" runtime-table-cell-name="">
        {runtimeName}
      </span>
    </div>
  );
};

const RuntimeTableCellSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5">
      <div className="size-4 animate-pulse rounded bg-gray-9" runtime-table-cell-icon="" />
      <div
        className="h-[1.125rem] w-16 animate-pulse rounded bg-gray-9"
        runtime-table-cell-name=""
      />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

RuntimeTableCell.Skeleton = RuntimeTableCellSkeleton;

export default RuntimeTableCell;
