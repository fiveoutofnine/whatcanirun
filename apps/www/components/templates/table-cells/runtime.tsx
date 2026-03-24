import { FileQuestionMark } from 'lucide-react';

import type { Run } from '@/lib/db/schema';

import LogoImg from '@/components/common/logo-img';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type RuntimeTableCellProps = Pick<Run, 'runtimeName'>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const RuntimeTableCell: React.FC<RuntimeTableCellProps> & { Skeleton: React.FC } = ({
  runtimeName,
}) => {
  return (
    <div className="flex items-center gap-1.5">
      {runtimeName === 'llama.cpp' ? (
        <a
          className="focus-visible:rounded"
          href="https://github.com/ggerganov/llama.cpp"
          target="_blank"
          rel="noreferrer"
        >
          <LogoImg.Ggml className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
        </a>
      ) : runtimeName === 'mlx_lm' ? (
        <a
          className="focus-visible:rounded"
          href="https://github.com/ml-explore/mlx-lm"
          target="_blank"
          rel="noreferrer"
        >
          <LogoImg.Mlx className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
        </a>
      ) : (
        <span className="flex size-4 items-center justify-center rounded border border-gray-6 bg-gray-5 text-gray-11">
          <FileQuestionMark className="size-2.5" />
        </span>
      )}
      <span className="line-clamp-1 leading-4">{runtimeName}</span>
    </div>
  );
};

const RuntimeTableCellSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5">
      <div className="size-4 animate-pulse rounded bg-gray-9" />
      <div className="h-[1.125rem] w-16 animate-pulse rounded bg-gray-9" />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

RuntimeTableCell.Skeleton = RuntimeTableCellSkeleton;

export default RuntimeTableCell;
