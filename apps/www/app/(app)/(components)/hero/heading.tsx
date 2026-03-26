'use client';

import { useMemo } from 'react';

import { useQueryState } from 'nuqs';

import Logo from '@/components/common/logo';
import DeviceCombobox from '@/components/templates/device-combobox';
import InlineButton from '@/components/templates/inline-button';
import RamCombobox from '@/components/templates/ram-combobox';

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

/** Chip key (hardware config without RAM). */
const chipKey = (c: { cpu: string; cpuCores: number; gpu: string; gpuCores: number }) =>
  `${c.cpu}:${c.cpuCores}:${c.gpu}:${c.gpuCores}`;

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

  // Parse chip key (first 4 segments) and RAM (5th segment) from device param.
  const selectedChip = device.split(':').slice(0, 4).join(':');
  const selectedRam = device.split(':')[4] ?? '';

  // Find selected device info for display.
  const selected = useMemo(
    () => chips.find((c) => c.chipId === device) ?? chips[0],
    [chips, device],
  );

  // RAM options for the selected chip config.
  const ramOptions = useMemo(
    () =>
      chips
        .filter((c) => chipKey(c) === selectedChip)
        .map((c) => c.ramGb)
        .sort((a, b) => a - b),
    [chips, selectedChip],
  );

  const effectiveRam = ramOptions.includes(Number(selectedRam))
    ? selectedRam
    : String(ramOptions[0] ?? '');

  const displayName = selected ? formatCpu(selected.cpu) : 'M1 Max';

  // Count distinct chip configs (without RAM) to decide if combobox is needed.
  const uniqueChipCount = useMemo(() => new Set(chips.map(chipKey)).size, [chips]);

  const chipElement =
    uniqueChipCount > 1 ? (
      <DeviceCombobox
        devices={chips}
        value={selectedChip}
        onSelect={(nextChip: string) => {
          const nextRam = chips
            .filter((c) => chipKey(c) === nextChip)
            .map((c) => c.ramGb)
            .sort((a, b) => a - b)[0];
          setDevice(`${nextChip}:${nextRam}`);
        }}
      >
        <InlineButton className="rounded-md font-semibold text-gray-12 transition-colors hover:bg-gray-4 focus-visible:bg-gray-4">
           {displayName}
        </InlineButton>
      </DeviceCombobox>
    ) : (
      <span className="font-semibold text-gray-12">{displayName}</span>
    );

  const ramElement =
    ramOptions.length === 1 ? (
      <RamCombobox
        options={ramOptions}
        value={effectiveRam}
        onSelect={(ram: string) => setDevice(`${selectedChip}:${ram}`)}
      >
        <InlineButton className="rounded-md font-semibold text-gray-12 transition-colors hover:bg-gray-4 focus-visible:bg-gray-4">
          {effectiveRam} GB RAM
        </InlineButton>
      </RamCombobox>
    ) : (
      <span className="font-semibold text-gray-12">{effectiveRam} GB RAM</span>
    );

  return (
    <h1 className="mb-2 text-3xl font-normal leading-snug tracking-tight text-gray-11 md:mb-4 md:text-5xl md:leading-[1.167]">
      <Logo className="inline select-text text-3xl md:text-5xl" /> on an {chipElement} with{' '}
      {ramElement}?
    </h1>
  );
};

export default HeroHeading;
