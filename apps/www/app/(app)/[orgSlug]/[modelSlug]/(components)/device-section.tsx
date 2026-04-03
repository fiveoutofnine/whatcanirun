'use client';

import { Fragment, useMemo, useState } from 'react';

import DevicePerformance from './device-performance';
import { ChevronsUpDown } from 'lucide-react';

import DeviceCombobox from '@/components/templates/device-combobox';
import InlineButton from '@/components/templates/inline-button';
import { H2 } from '@/components/templates/mdx';

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

type VariantPerf = {
  modelId: string;
  quant: string | null;
  format: string;
  compositeScore: number;
  bestRuntime: string;
  avgDecodeTps: number;
  avgPrefillTps: number;
  ttftP50Ms: number;
  avgPeakRssMb: number | null;
};

type DeviceSectionProps = {
  chips: ChipOption[];
  perfsByDevice: Record<string, VariantPerf[]>;
  defaultDevice: string;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const formatCpu = (name: string) => name.replace(/^\S+\s+/, '');

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DeviceSection: React.FC<DeviceSectionProps> = ({ chips, perfsByDevice, defaultDevice }) => {
  const [device, setDevice] = useState(defaultDevice);

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
        value={device}
        onSelect={(chipId: string) => setDevice(chipId)}
      >
        <InlineButton className="-mx-[0.1em] rounded-xl border border-dashed border-gray-7 bg-gray-3 box-decoration-clone px-[0.1em] font-semibold text-gray-12 transition-colors hover:border-gray-8 hover:bg-gray-4 focus-visible:border-gray-8 focus-visible:bg-gray-4 active:bg-gray-5">
          {buttonContent}
          <ChevronsUpDown className="ml-[0.075em] inline size-[0.8em] align-[-0.025em] text-gray-11" />
        </InlineButton>
      </DeviceCombobox>
    ) : (
      <span className="font-semibold text-gray-12">{buttonContent}</span>
    );

  const perfs = perfsByDevice[device] ?? [];

  return (
    <>
      <H2 className="mb-2 mt-4 px-4 md:mt-8 md:px-0" link={false}>
        Performance on {chipElement}
      </H2>
      <DevicePerformance perfs={perfs} deviceRamGb={selected?.ramGb ?? 0} />
    </>
  );
};

export default DeviceSection;
