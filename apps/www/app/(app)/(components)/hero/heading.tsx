'use client';

import { useMemo } from 'react';

import { useQueryState } from 'nuqs';

import Logo from '@/components/common/logo';
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
// Constants
// -----------------------------------------------------------------------------

const FALLBACK_DEVICE = 'Apple M1 Max:10:Apple M1 Max:32:64';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Strip manufacturer prefix for display (e.g. "Apple M1 Max" → "M1 Max"). */
const formatCpu = (name: string) => name.replace(/^\S+\s+/, '');

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const HeroHeading: React.FC<{ chips: ChipOption[] }> = ({ chips }) => {
  // Default to the chip with the most models, then hardcoded fallback.
  const defaultDevice = useMemo(() => {
    const sorted = [...chips].sort((a, b) => b.modelCount - a.modelCount);
    return sorted[0]?.chipId ?? FALLBACK_DEVICE;
  }, [chips]);

  const [device, setDevice] = useQueryState('device', {
    defaultValue: defaultDevice,
    shallow: false,
  });

  // Find selected device info for display.
  const selected = useMemo(
    () => chips.find((c) => c.chipId === device) ?? chips[0],
    [chips, device],
  );

  // Sort by GPU (primary), gpu cores, CPU, cpu cores, RAM, then model count (last tie-breaker).
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

  const displayName = selected ? formatCpu(selected.cpu) : 'M1 Max';
  const displayRam = selected?.ramGb ?? 64;

  const chipElement =
    chips.length > 1 ? (
      <DeviceCombobox
        devices={chipsSorted}
        value={device}
        onSelect={(chipId: string) => setDevice(chipId)}
      >
        <InlineButton className="-mx-[0.1em] rounded-xl border border-dashed border-gray-7 bg-gray-3 box-decoration-clone px-[0.1em] font-semibold text-gray-12 transition-colors hover:border-gray-8 hover:bg-gray-4 focus-visible:border-gray-8 focus-visible:bg-gray-4 active:bg-gray-5">
          {displayName}
          <span className="font-normal text-gray-11"> with </span>
          {displayRam} GB RAM
        </InlineButton>
      </DeviceCombobox>
    ) : (
      <span className="font-semibold text-gray-12">
        {displayName}
        <span className="font-normal text-gray-11"> with </span>
        {displayRam} GB RAM
      </span>
    );

  return (
    <h1 className="mb-2 text-3xl font-normal leading-snug tracking-tight text-gray-11 md:mb-4 md:text-5xl md:leading-[1.167]">
      <Logo className="inline select-text text-3xl md:text-5xl" /> on an {chipElement}?
    </h1>
  );
};

export default HeroHeading;
