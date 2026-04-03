'use client';

import { Fragment, useMemo } from 'react';

import { ChevronsUpDown } from 'lucide-react';
import { useQueryState } from 'nuqs';

import type { Device } from '@/lib/db/schema';
import { formatChipName, parseManufacturer } from '@/lib/utils';

import DeviceCombobox from '@/components/templates/device-combobox';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ChipOption = Pick<
  Device,
  'chipId' | 'cpu' | 'cpuCores' | 'gpu' | 'gpuCores' | 'ramGb'
> & {
  modelCount: number;
};

type DeviceFloatingSelectorProps = {
  chips: ChipOption[];
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceFloatingSelector: React.FC<DeviceFloatingSelectorProps> = ({ chips }) => {
  const defaultDevice = useMemo(() => {
    const sorted = [...chips].sort((a, b) => b.modelCount - a.modelCount);
    return sorted[0]?.chipId ?? '';
  }, [chips]);

  const [device, setDevice] = useQueryState('device', {
    defaultValue: defaultDevice,
    shallow: false,
  });

  const selected = useMemo(
    () => chips.find((c) => c.chipId === device) ?? chips[0],
    [chips, device],
  );

  const chipsSorted = useMemo(
    () =>
      chips
        .toSorted((a, b) => b.modelCount - a.modelCount)
        .toSorted((a, b) => b.ramGb - a.ramGb)
        .toSorted((a, b) => b.cpuCores - a.cpuCores)
        .toSorted((a, b) => a.cpu.localeCompare(b.cpu))
        .toSorted((a, b) => b.gpuCores - a.gpuCores)
        .toSorted((a, b) => b.gpu.localeCompare(a.gpu)),
    [chips],
  );

  const isApple = selected ? selected.gpu.toLowerCase().startsWith('apple') : true;
  const hasGpu = selected ? selected.gpuCores > 0 : false;

  const displayName = selected
    ? isApple
      ? formatChipName(selected.cpu)
      : hasGpu
        ? formatChipName(selected.gpu)
        : formatChipName(selected.cpu)
    : '';
  const displayRam = selected?.ramGb ?? 0;

  const buttonContent = isApple ? (
    <Fragment>
      {displayName}
      <span className="font-normal text-gray-11"> · </span>
      <span className="font-normal text-gray-11">{displayRam} GB</span>
    </Fragment>
  ) : (
    <Fragment>{displayName}</Fragment>
  );

  if (chips.length <= 1) return null;

  const primaryName = selected
    ? isApple
      ? selected.gpu
      : hasGpu
        ? selected.gpu
        : selected.cpu
    : '';
  const { logo: Logo } = parseManufacturer(primaryName);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-50 flex justify-center">
      <DeviceCombobox devices={chipsSorted} value={device} onSelect={setDevice}>
        <button className="pointer-events-auto h-8 rounded-full border border-gray-7 bg-gray-3 shadow-lg backdrop-blur transition-colors hover:border-gray-8 hover:bg-gray-4 focus-visible:border-gray-8 focus-visible:bg-gray-4 active:bg-gray-5">
          <span className="flex items-center gap-1.5 pl-1 pr-2.5 text-base">
            {Logo ? <Logo size={24} className="rounded-full border border-gray-6" /> : null}
            <span className="font-medium text-gray-12">{buttonContent}</span>
            <ChevronsUpDown className="size-4 text-gray-11" />
          </span>
        </button>
      </DeviceCombobox>
    </div>
  );
};

export default DeviceFloatingSelector;
