import { Fragment } from 'react';

import clsx from 'clsx';
import { Cpu, Gpu, MemoryStick } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { getVramGb } from '@/lib/constants/gpu';
import type { Device } from '@/lib/db/schema';
import { parseManufacturer } from '@/lib/utils';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import { Badge } from '@/components/ui';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MANUFACTURER_LABEL: Record<string, string> = {
  nvidia: 'NVIDIA',
  amd: 'AMD',
  intel: 'Intel',
  apple: 'Apple',
};

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type DeviceTableCellProps = Pick<
  Device,
  'cpu' | 'cpuCores' | 'gpu' | 'gpuCores' | 'ramGb' | 'osName'
>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceTableCell: React.FC<DeviceTableCellProps> & { Skeleton: React.FC } = ({
  cpu,
  cpuCores,
  gpu,
  gpuCores,
  ramGb,
  osName,
}) => {
  const isMac = osName?.toLowerCase() === 'macos';

  if (!isMac) {
    const hasGpu = gpuCores > 0;
    const primaryName = hasGpu ? gpu : cpu;
    const { manufacturer, displayName, logo: Icon } = parseManufacturer(primaryName);

    if (!hasGpu) {
      return (
        <div className="flex flex-col items-start">
          <span className="flex items-center gap-1.5 leading-5">
            {Icon && manufacturer ? (
              <ClickableTooltip
                content={MANUFACTURER_LABEL[manufacturer]}
                triggerProps={{ className: 'rounded' }}
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded">
                  <Icon className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
                </span>
              </ClickableTooltip>
            ) : null}
            <span className="line-clamp-1">{displayName}</span>
            <Badge size="sm" variant="outline" intent="info">
              CPU
            </Badge>
          </span>
          <div className="mt-0 flex h-4 gap-2">
            <ClickableTooltip content="CPU cores">
              <div className="flex w-fit items-center gap-1 whitespace-nowrap text-xs leading-4 text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12">
                <span className="flex size-3 items-center justify-center">
                  <Cpu />
                </span>
                <span>{Number(cpuCores).toLocaleString()}</span>
              </div>
            </ClickableTooltip>
            <ClickableTooltip content="RAM">
              <div className="flex w-fit items-center gap-1 whitespace-nowrap text-xs leading-4 text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12">
                <span className="flex size-3 items-center justify-center">
                  <MemoryStick />
                </span>
                <span>{Number(ramGb).toLocaleString()} GB</span>
              </div>
            </ClickableTooltip>
          </div>
        </div>
      );
    }

    const vram = getVramGb(gpu);
    return (
      <div className="flex flex-col items-start">
        <span className="flex items-center gap-1.5 leading-5">
          {Icon && manufacturer ? (
            <ClickableTooltip
              content={MANUFACTURER_LABEL[manufacturer]}
              triggerProps={{ className: 'rounded' }}
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded">
                <Icon className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
              </span>
            </ClickableTooltip>
          ) : null}
          <span className="line-clamp-1">{displayName}</span>
        </span>
        {vram != null ? (
          <div className="mt-0 flex h-4 gap-2">
            <ClickableTooltip content="VRAM">
              <div className="flex w-fit items-center gap-1 whitespace-nowrap text-xs leading-4 text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12">
                <span className="flex size-3 items-center justify-center">
                  <MemoryStick />
                </span>
                <span>{vram} GB</span>
              </div>
            </ClickableTooltip>
          </div>
        ) : null}
      </div>
    );
  }

  // macOS branch.
  const { manufacturer, displayName, logo: Icon } = parseManufacturer(gpu ?? cpu);

  return (
    <div className="flex flex-col items-start">
      <span className="flex items-center gap-1.5 leading-5">
        {Icon && manufacturer ? (
          <ClickableTooltip
            content={MANUFACTURER_LABEL[manufacturer]}
            triggerProps={{ className: 'rounded' }}
          >
            <span className="flex size-4 shrink-0 items-center justify-center rounded">
              <Icon className="border-gray-7 transition-colors hover:border-gray-8" size={16} />
            </span>
          </ClickableTooltip>
        ) : null}
        <span className="line-clamp-1">{displayName}</span>
      </span>
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
      <span className="h-[1.125rem] w-28 animate-pulse rounded bg-gray-9" />
      <div className="flex h-4 gap-2">
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
