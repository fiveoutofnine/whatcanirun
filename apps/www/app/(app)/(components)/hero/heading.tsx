'use client';

import { useMemo } from 'react';

import { useQueryState } from 'nuqs';

import Logo from '@/components/common/logo';
import { Select } from '@/components/ui';

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

/** Chip key (hardware config without RAM). */
const chipKey = (c: { cpu: string; cpuCores: number; gpu: string; gpuCores: number }) =>
  `${c.cpu}:${c.cpuCores}:${c.gpu}:${c.gpuCores}`;

/** Strip "Apple " prefix for display (e.g. "Apple M1 Max" → "M1 Max"). */
const formatCpu = (name: string) => name.replace(/^Apple\s+/i, '');

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const HeroHeading: React.FC<{ chips: ChipOption[] }> = ({ chips }) => {
  // Distinct chip configs (cpu + cores), deduplicated and sorted.
  const chipConfigs = useMemo(() => {
    const seen = new Map<string, ChipOption>();
    for (const c of chips) {
      const key = chipKey(c);
      // Keep the entry with the highest modelCount for each chip config.
      const existing = seen.get(key);
      if (!existing || c.modelCount > existing.modelCount) seen.set(key, c);
    }
    return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [chips]);

  // Default to the chip with the most models, then hardcoded fallback.
  const defaultDevice = useMemo(() => {
    const sorted = [...chips].sort((a, b) => b.modelCount - a.modelCount);
    return sorted[0]?.chipId ?? FALLBACK_DEVICE;
  }, [chips]);

  const [device, setDevice] = useQueryState('device', {
    defaultValue: defaultDevice,
    shallow: false,
  });

  // Parse the selected chip key and RAM from the device param.
  const selectedChip = device.split(':').slice(0, 4).join(':');
  const selectedRam = device.split(':')[4] ?? '';

  // Check how many chips share the same CPU name to decide if we need to show core counts.
  const cpuNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [, c] of chipConfigs) {
      counts.set(c.cpu, (counts.get(c.cpu) ?? 0) + 1);
    }
    return counts;
  }, [chipConfigs]);

  const formatChipLabel = (c: ChipOption) => {
    const name = formatCpu(c.cpu);
    if ((cpuNameCounts.get(c.cpu) ?? 0) <= 1) return name;
    return `${name} (${c.cpuCores}c CPU, ${c.gpuCores}c GPU)`;
  };

  // RAM options valid for the selected chip config.
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

  return (
    <h1 className="mb-2 text-3xl font-normal leading-snug tracking-tight text-gray-11 md:mb-4 md:text-5xl md:leading-[1.167]">
      <Logo className="inline select-text text-3xl md:text-5xl" /> on an{' '}
      <Select
        variant="ghost"
        size="lg"
        className="inline-flex h-auto min-w-0 p-0 pl-0 pr-6 text-3xl font-semibold text-gray-12 md:pr-8 md:text-5xl"
        value={selectedChip}
        onChange={(e) => {
          const nextChip = e.target.value;
          // Pick the first valid RAM for the new chip.
          const nextRam = chips
            .filter((c) => chipKey(c) === nextChip)
            .map((c) => c.ramGb)
            .sort((a, b) => a - b)[0];
          setDevice(`${nextChip}:${nextRam}`);
        }}
      >
        {chipConfigs.map(([key, c]) => (
          <option key={key} value={key}>
            {formatChipLabel(c)}
          </option>
        ))}
      </Select>{' '}
      with{' '}
      <Select
        variant="ghost"
        size="lg"
        className="inline-flex h-auto min-w-0 p-0 pl-0 pr-6 text-3xl font-semibold text-gray-12 md:pr-8 md:text-5xl"
        value={effectiveRam}
        onChange={(e) => setDevice(`${selectedChip}:${e.target.value}`)}
      >
        {ramOptions.map((r) => (
          <option key={r} value={String(r)}>
            {r} GB RAM
          </option>
        ))}
      </Select>
      ?
    </h1>
  );
};

export default HeroHeading;
