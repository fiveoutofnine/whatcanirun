'use client';

import { Fragment, useMemo } from 'react';

import { ChevronsUpDown } from 'lucide-react';
import { useQueryState } from 'nuqs';

import DeviceCombobox from '@/components/templates/device-combobox';
import InlineButton from '@/components/templates/inline-button';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ChipOption = {
  chipId: string;
  cpu: string;
  cpuCores: number;
  gpu: string;
  gpuCores: number;
  ramGb: number;
  modelCount: number;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const formatCpu = (name: string) => name.replace(/^\S+\s+/, '');

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DevicePill: React.FC<{ chips: ChipOption[] }> = ({ chips }) => {
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
      ? formatCpu(selected.cpu)
      : hasGpu
        ? selected.gpu.replace(/^\S+\s+/, '')
        : selected.cpu.replace(/^\S+\s+/, '')
    : '';
  const displayRam = selected?.ramGb ?? 0;

  const buttonContent = isApple ? (
    <Fragment>
      {displayName}
      <span className="font-normal text-gray-11"> · </span>
      {displayRam} GB
    </Fragment>
  ) : (
    <Fragment>{displayName}</Fragment>
  );

  if (chips.length <= 1) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
      <DeviceCombobox devices={chipsSorted} value={device} onSelect={setDevice}>
        <InlineButton className="pointer-events-auto rounded-full border border-gray-7 bg-gray-2 px-4 py-2 text-sm font-semibold text-gray-12 shadow-lg backdrop-blur transition-colors hover:border-gray-8 hover:bg-gray-3 focus-visible:border-gray-8 focus-visible:bg-gray-3 active:bg-gray-4">
          {buttonContent}
          <ChevronsUpDown className="ml-1.5 inline size-3.5 align-[-0.1em] text-gray-11" />
        </InlineButton>
      </DeviceCombobox>
    </div>
  );
};

export default DevicePill;
