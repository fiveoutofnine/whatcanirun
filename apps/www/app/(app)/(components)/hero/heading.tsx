'use client';

import { Fragment, useEffect, useMemo } from 'react';

import { ChevronsUpDown } from 'lucide-react';
import { useQueryState } from 'nuqs';

import { useDetectedDevice } from '@/lib/hooks';
import { usePreservedNavigationDevice } from '@/lib/preserved-device-navigation';
import { formatChipName } from '@/lib/utils';

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
  gpuCount: number;
  ramGb: number;
  modelCount: number;
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const FALLBACK_DEVICE = 'Apple M1 Max:10:Apple M1 Max:32:64';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const HeroHeading: React.FC<{ chips: ChipOption[] }> = ({ chips }) => {
  const [, setPagination] = useQueryState('pagination', { shallow: false });
  const [, setSorting] = useQueryState('sorting', { shallow: false });

  // Fallback to the chip with the most models, then hardcoded fallback.
  const defaultDevice = useMemo(() => {
    const sorted = [...chips].sort((a, b) => b.modelCount - a.modelCount);
    return sorted[0]?.chipId ?? FALLBACK_DEVICE;
  }, [chips]);

  const [device, setDevice] = useQueryState('device', {
    defaultValue: defaultDevice,
    shallow: false,
  });
  const detectedChip = useDetectedDevice(chips);
  usePreservedNavigationDevice(device);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('device') || !detectedChip || device === detectedChip.chipId) return;
    setDevice(detectedChip.chipId);
  }, [detectedChip, device, setDevice]);

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

  const isApple = selected ? selected.gpu.toLowerCase().startsWith('apple') : true;
  const hasGpu = selected ? selected.gpuCount > 0 : false;

  // Apple: strip manufacturer from CPU name, show RAM.
  // Non-Apple GPU: strip manufacturer from GPU name.
  // Non-Apple CPU-only: strip manufacturer from CPU name.
  const gpuCount = selected?.gpuCount ?? 1;
  const countPrefix = !isApple && gpuCount > 1 ? `${gpuCount}×` : '';
  const displayName = selected
    ? countPrefix +
      (isApple
        ? formatChipName(selected.cpu)
        : hasGpu
          ? formatChipName(selected.gpu)
          : formatChipName(selected.cpu))
    : 'M1 Max';
  const displayRam = selected?.ramGb ?? 64;

  const buttonContent = isApple ? (
    <Fragment>
      {displayName}
      <span className="font-normal text-gray-11"> with </span>
      {displayRam} GB RAM
    </Fragment>
  ) : (
    <Fragment>{displayName}</Fragment>
  );

  const chipElement =
    chips.length > 1 ? (
      <DeviceCombobox
        devices={chipsSorted}
        detectedDeviceChipId={detectedChip?.chipId ?? null}
        value={device}
        onSelect={(chipId: string) => {
          setDevice(chipId);
          setPagination(null);
          setSorting(null);
        }}
      >
        <InlineButton className="-mx-[0.1em] rounded-xl border border-dashed border-gray-7 bg-gray-3 box-decoration-clone px-[0.1em] font-semibold text-gray-12 transition-colors hover:border-gray-8 hover:bg-gray-4 focus-visible:border-gray-8 focus-visible:bg-gray-4 active:bg-gray-5">
          {buttonContent}
          <ChevronsUpDown className="ml-[0.075em] inline size-[0.8em] align-[-0.025em] text-gray-11" />
        </InlineButton>
      </DeviceCombobox>
    ) : (
      <span className="font-semibold text-gray-12">{buttonContent}</span>
    );

  const article = isApple || 'aeiou'.includes(displayName.charAt(0).toLowerCase()) ? 'an' : 'a';

  return (
    <h1 className="mb-2 text-3xl font-normal leading-snug tracking-tight text-gray-11 md:mb-4 md:text-5xl md:leading-[1.167]">
      <Logo className="inline select-text text-3xl md:text-5xl" /> on {article} {chipElement}?
    </h1>
  );
};

export default HeroHeading;
