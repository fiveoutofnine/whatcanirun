'use client';

import { useMemo } from 'react';

import { useQueryState } from 'nuqs';

import Logo from '@/components/common/logo';
import DeviceCombobox from '@/components/templates/device-combobox';

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

/** Strip "Apple " prefix for display (e.g. "Apple M1 Max" → "M1 Max"). */
const formatCpu = (name: string) => name.replace(/^Apple\s+/i, '');

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

  // Find the selected device's info for display.
  const selected = useMemo(
    () => chips.find((c) => c.chipId === device) ?? chips[0],
    [chips, device],
  );

  const displayName = selected ? formatCpu(selected.cpu) : 'M1 Max';
  const displayRam = selected ? `${selected.ramGb} GB RAM` : '64 GB RAM';

  return (
    <h1 className="mb-2 text-3xl font-normal leading-snug tracking-tight text-gray-11 md:mb-4 md:text-5xl md:leading-[1.167]">
      <Logo className="inline select-text text-3xl md:text-5xl" /> on an{' '}
      <DeviceCombobox devices={chips} value={device} onSelect={setDevice}>
        <button
          className="inline-flex items-baseline gap-1 rounded-lg font-semibold text-gray-12 underline decoration-dashed transition-colors hover:text-gray-11"
          type="button"
        >
          {displayName}
        </button>
      </DeviceCombobox>{' '}
      with <span className="font-semibold text-gray-12">{displayRam}</span>?
    </h1>
  );
};

export default HeroHeading;
