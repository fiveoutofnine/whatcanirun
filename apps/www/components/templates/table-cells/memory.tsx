'use client';

import clsx from 'clsx';

import type { Device, Run } from '@/lib/db/schema';

import ClickableTooltip from '@/components/templates/clickable-tooltip';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type MemoryTableCellProps = {
  align?: 'left' | 'right';
  usedGb: Run['peakRssMb'];
  totalGb: Device['ramGb'];
};

type MemoryTableCellSkeletonProps = {
  align?: 'left' | 'right';
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const MemoryTableCell: React.FC<MemoryTableCellProps> & {
  Skeleton: React.FC<MemoryTableCellSkeletonProps>;
} = ({ align, usedGb, totalGb }) => {
  if (usedGb === 0) return <span className="w-fit italic text-gray-11">N/A</span>;

  const percentage = (usedGb / totalGb) * 100;

  const background = {
    green: [
      'bg-[linear-gradient(to_right,rgb(var(--green9))_var(--fill),rgb(var(--gray3))_var(--fill))]',
      'hover:bg-[linear-gradient(to_right,rgb(var(--green10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
      'focus-visible:bg-[linear-gradient(to_right,rgb(var(--green10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
    ],
    yellow: [
      'bg-[linear-gradient(to_right,rgb(var(--yellow9))_var(--fill),rgb(var(--gray3))_var(--fill))]',
      'hover:bg-[linear-gradient(to_right,rgb(var(--yellow10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
      'focus-visible:bg-[linear-gradient(to_right,rgb(var(--yellow10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
    ],
    orange: [
      'bg-[linear-gradient(to_right,rgb(var(--orange9))_var(--fill),rgb(var(--gray3))_var(--fill))]',
      'hover:bg-[linear-gradient(to_right,rgb(var(--orange10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
      'focus-visible:bg-[linear-gradient(to_right,rgb(var(--orange10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
    ],
    red: [
      'bg-[linear-gradient(to_right,rgb(var(--red9))_var(--fill),rgb(var(--gray3))_var(--fill))]',
      'hover:bg-[linear-gradient(to_right,rgb(var(--red10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
      'focus-visible:bg-[linear-gradient(to_right,rgb(var(--red10))_var(--fill),rgb(var(--gray4))_var(--fill))]',
    ],
  } as const;

  let color: keyof typeof background = 'green';
  if (percentage > 50) color = 'yellow';
  if (percentage > 75) color = 'orange';
  if (percentage > 85) color = 'red';

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex w-full items-end justify-between gap-2">
        <div className={clsx('text-nowrap tabular-nums', align === 'left' ? 'order-1' : 'order-2')}>
          {Number(usedGb).toLocaleString(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}{' '}
          <span className="text-gray-11">GB</span>
        </div>
        <span
          className={clsx(
            'text-nowrap text-xs tabular-nums text-gray-11',
            align === 'left' ? 'order-2' : 'order-1',
          )}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
      <ClickableTooltip
        content={
          <span className="tabular-nums text-gray-11">
            <span className="text-gray-12">{percentage.toFixed(2)}%</span> of{' '}
            <span className="text-gray-12">{totalGb} GB</span> used
          </span>
        }
        triggerProps={{ className: 'w-full rounded-full' }}
      >
        <div
          className={clsx(
            'h-2 w-full rounded-full border border-gray-7 transition-colors hover:border-gray-8',
            background[color],
          )}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          style={{ '--fill': `${percentage}%` } as React.CSSProperties}
        />
      </ClickableTooltip>
    </div>
  );
};

const MemoryTableCellSkeleton: React.FC<MemoryTableCellSkeletonProps> = ({ align }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex w-full items-end justify-between gap-2">
        <div
          className={clsx(
            'h-[1.125rem] w-16 animate-pulse rounded bg-gray-9',
            align === 'left' ? 'order-1' : 'order-2',
          )}
        />
        <div
          className={clsx(
            'h-4 w-6 animate-pulse rounded bg-gray-9',
            align === 'left' ? 'order-2' : 'order-1',
          )}
        />
      </div>
      <div className="h-2 w-full animate-pulse rounded-full bg-gray-9" />
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

MemoryTableCell.Skeleton = MemoryTableCellSkeleton;

export default MemoryTableCell;
