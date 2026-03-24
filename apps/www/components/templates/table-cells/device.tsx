import { Fragment } from 'react';

import clsx from 'clsx';
import { Cpu, Gpu, MemoryStick } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import type { Device } from '@/lib/db/schema';

import ClickableTooltip from '@/components/templates/clickable-tooltip';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type DeviceTableCellProps = Pick<Device, 'cpu' | 'cpuCores' | 'gpu' | 'gpuCores' | 'ramGb'>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceTableCell: React.FC<DeviceTableCellProps> & { Skeleton: React.FC } = ({
  cpu,
  cpuCores,
  gpu,
  gpuCores,
  ramGb,
}) => {
  return (
    <div className="flex flex-col items-start">
      <span className="line-clamp-1 leading-5">{cpu ?? gpu}</span>
      <div className="mt-0 flex h-4 gap-2">
        {[
          {
            icon: <Cpu />,
            value: Number(cpuCores).toLocaleString(),
            content: 'CPU cores',
          },
          {
            icon: <Gpu />,
            value: Number(gpuCores).toLocaleString(),
            content: 'GPU cores',
          },
          {
            icon: <MemoryStick />,
            value: `${Number(ramGb).toLocaleString()} GB`,
            content: 'RAM',
          },
        ].map(({ icon, value, content }, index) => {
          if (!value) return null;

          const Children = (
            <div
              className={clsx(
                'flex w-fit items-center gap-1 whitespace-nowrap text-xs leading-4 text-gray-11',
                content ? 'underline decoration-dotted transition-colors hover:text-gray-12' : '',
              )}
              key={index}
            >
              <span className="flex size-3 items-center justify-center">{icon}</span>
              <span>{value}</span>
            </div>
          );

          if (content) {
            return (
              <ClickableTooltip key={index} content={content}>
                {Children}
              </ClickableTooltip>
            );
          }

          return <Fragment key={index}>{Children}</Fragment>;
        })}
      </div>
    </div>
  );
};

const DeviceTableCellSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="h-5 w-28 animate-pulse rounded bg-gray-9" />
      <div className="mt-0 flex h-4 gap-2">
        {[
          { icon: <Cpu />, className: 'w-3' },
          { icon: <Gpu />, className: 'w-3' },
          { icon: <MemoryStick />, className: 'w-9' },
        ].map(({ icon, className }, index) => {
          return (
            <div className="flex w-fit items-center gap-1 text-gray-11" key={index}>
              <span className="flex size-3 items-center justify-center">{icon}</span>
              <span
                className={twMerge(clsx('h-4 w-12 animate-pulse rounded bg-gray-9', className))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

DeviceTableCell.Skeleton = DeviceTableCellSkeleton;

export default DeviceTableCell;
