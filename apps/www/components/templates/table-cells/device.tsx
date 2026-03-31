import { Fragment } from 'react';

import clsx from 'clsx';
import { Cpu, Gpu, MemoryStick } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import type { Device } from '@/lib/db/schema';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import { Badge } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type DeviceTableCellProps = Pick<
  Device,
  'cpu' | 'cpuCores' | 'gpu' | 'gpuCores' | 'ramGb' | 'osName'
>;

// -----------------------------------------------------------------------------
// GPU VRAM lookup (GB)
// -----------------------------------------------------------------------------

const GPU_VRAM: Record<string, number> = {
  // NVIDIA Blackwell
  b200: 192,
  b100: 192,
  gb200: 192,
  gb300: 288,
  // NVIDIA GeForce RTX 50-series (desktop)
  'geforce rtx 5090': 32,
  'geforce rtx 5080': 16,
  'geforce rtx 5070 ti': 16,
  'geforce rtx 5070': 12,
  // NVIDIA GeForce RTX 50-series (laptop)
  'geforce rtx 5090 laptop gpu': 24,
  'geforce rtx 5080 laptop gpu': 16,
  'geforce rtx 5070 ti laptop gpu': 12,
  'geforce rtx 5070 laptop gpu': 8,
  // NVIDIA GeForce RTX 40-series (desktop)
  'geforce rtx 4090': 24,
  'geforce rtx 4080 super': 16,
  'geforce rtx 4080': 16,
  'geforce rtx 4070 ti super': 16,
  'geforce rtx 4070 ti': 12,
  'geforce rtx 4070 super': 12,
  'geforce rtx 4070': 12,
  'geforce rtx 4060 ti': 8,
  'geforce rtx 4060': 8,
  // NVIDIA GeForce RTX 40-series (laptop)
  'geforce rtx 4090 laptop gpu': 16,
  'geforce rtx 4080 laptop gpu': 12,
  'geforce rtx 4070 laptop gpu': 8,
  'geforce rtx 4060 laptop gpu': 8,
  'geforce rtx 4050 laptop gpu': 6,
  // NVIDIA GeForce RTX 30-series (desktop)
  'geforce rtx 3090 ti': 24,
  'geforce rtx 3090': 24,
  'geforce rtx 3080 ti': 12,
  'geforce rtx 3080': 10,
  'geforce rtx 3070 ti': 8,
  'geforce rtx 3070': 8,
  'geforce rtx 3060 ti': 8,
  'geforce rtx 3060': 12,
  // NVIDIA GeForce RTX 30-series (laptop)
  'geforce rtx 3080 ti laptop gpu': 16,
  'geforce rtx 3080 laptop gpu': 8,
  'geforce rtx 3070 ti laptop gpu': 8,
  'geforce rtx 3070 laptop gpu': 8,
  'geforce rtx 3060 laptop gpu': 6,
  'geforce rtx 3050 ti laptop gpu': 4,
  'geforce rtx 3050 laptop gpu': 4,
  // NVIDIA GeForce RTX 20-series (desktop)
  'geforce rtx 2080 ti': 11,
  'geforce rtx 2080 super': 8,
  'geforce rtx 2080': 8,
  'geforce rtx 2070 super': 8,
  'geforce rtx 2070': 8,
  'geforce rtx 2060 super': 8,
  'geforce rtx 2060': 6,
  // NVIDIA A-series (data center)
  'a100 80gb': 80,
  a100: 40,
  'a800 80gb': 80,
  a800: 40,
  a40: 48,
  a30: 24,
  a16: 16,
  a10g: 24,
  a10: 24,
  a2: 16,
  // NVIDIA professional (RTX)
  'rtx a6000': 48,
  'rtx a5500': 24,
  'rtx a5000': 24,
  'rtx a4500': 20,
  'rtx a4000': 16,
  'rtx a2000': 6,
  'rtx 6000 ada': 48,
  'rtx 5880 ada': 48,
  'rtx 5000 ada': 32,
  'rtx 4500 ada': 24,
  'rtx 4000 ada': 20,
  'rtx 4000 sff ada': 20,
  'rtx 2000 ada': 16,
  // NVIDIA H-series (data center)
  'h100 80gb': 80,
  h100: 80,
  h200: 141,
  h800: 80,
  // NVIDIA L-series (data center)
  l40s: 48,
  l40: 48,
  l4: 24,
  // AMD Radeon RX 7000-series
  'radeon rx 7900 xtx': 24,
  'radeon rx 7900 xt': 20,
  'radeon rx 7900 gre': 16,
  'radeon rx 7800 xt': 16,
  'radeon rx 7700 xt': 12,
  'radeon rx 7600 xt': 16,
  'radeon rx 7600': 8,
  // AMD Radeon RX 6000-series
  'radeon rx 6950 xt': 16,
  'radeon rx 6900 xt': 16,
  'radeon rx 6800 xt': 16,
  'radeon rx 6800': 16,
  'radeon rx 6700 xt': 12,
  'radeon rx 6600 xt': 8,
  'radeon rx 6600': 8,
};

/** Look up VRAM by matching the GPU name suffix (case-insensitive). */
function getVramGb(gpu: string): number | null {
  const lower = gpu.toLowerCase();
  // Try longest keys first so "4080 super" matches before "4080".
  for (const [key, vram] of Object.entries(GPU_VRAM).sort((a, b) => b[0].length - a[0].length)) {
    if (lower.includes(key)) return vram;
  }
  return null;
}

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

    if (!hasGpu) {
      return (
        <div className="flex flex-col items-start">
          <span className="flex items-center gap-1.5 leading-5">
            <span className="line-clamp-1">{cpu}</span>
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
        <span className="line-clamp-1 leading-5">{gpu}</span>
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

  return (
    <div className="flex flex-col items-start">
      <span className="line-clamp-1 leading-5">{gpu ?? cpu}</span>
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
