'use client';

import { useState } from 'react';

import { ChevronDown } from 'lucide-react';

import DeviceCombobox from '@/components/templates/device-combobox';
import ScoreBadge from '@/components/templates/score-badge';
import { Button, Table } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type DeviceOption = {
  chipId: string;
  cpu: string;
  cpuCores: number;
  gpu: string;
  gpuCores: number;
  ramGb: number;
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

export type DevicePerformanceProps = {
  devices: DeviceOption[];
  perfByDevice: Record<string, VariantPerf[]>;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatTps(tps: number): string {
  return `${tps.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} tok/s`;
}

function formatTtft(ms: number): string {
  if (ms < 4_000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1_000).toFixed(2)} s`;
}

function formatMemory(mb: number | null): string {
  if (mb == null) return '—';
  return `${(mb / 1024).toFixed(2)} GB`;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DevicePerformance: React.FC<DevicePerformanceProps> = ({ devices, perfByDevice }) => {
  const [selectedChipId, setSelectedChipId] = useState<string>(devices[0]?.chipId ?? '');

  const selectedDevice = devices.find((d) => d.chipId === selectedChipId);
  const perfs = perfByDevice[selectedChipId] ?? [];
  const sorted = [...perfs].sort((a, b) => b.compositeScore - a.compositeScore);

  return (
    <div className="flex flex-col gap-3">
      {/* Device selector */}
      <DeviceCombobox devices={devices} value={selectedChipId} onSelect={setSelectedChipId}>
        <Button variant="outline" size="sm">
          <span className="line-clamp-1">
            {selectedDevice
              ? `${selectedDevice.gpu} (${selectedDevice.ramGb} GB)`
              : 'Select device'}
          </span>
          <ChevronDown className="ml-1 size-3.5 shrink-0 text-gray-11" />
        </Button>
      </DeviceCombobox>

      {/* Per-variant table */}
      {sorted.length > 0 ? (
        <Table.Root containerClassName="hidden md:block border border-gray-6 rounded-xl hide-scrollbar [&>table]:border-0">
          <Table.Header>
            <Table.Row>
              <Table.Head>Variant</Table.Head>
              <Table.Head className="text-right">Decode</Table.Head>
              <Table.Head className="text-right">Prefill</Table.Head>
              <Table.Head className="text-right">TTFT (p50)</Table.Head>
              <Table.Head className="text-right">Peak mem</Table.Head>
              <Table.Head className="text-right">Runtime</Table.Head>
              <Table.Head className="text-right">Score</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sorted.map((p) => (
              <Table.Row key={p.modelId}>
                <Table.Cell className="font-medium">{p.quant ?? p.format}</Table.Cell>
                <Table.Cell className="text-right tabular-nums">
                  {formatTps(p.avgDecodeTps)}
                </Table.Cell>
                <Table.Cell className="text-right tabular-nums">
                  {formatTps(p.avgPrefillTps)}
                </Table.Cell>
                <Table.Cell className="text-right tabular-nums">
                  {formatTtft(p.ttftP50Ms)}
                </Table.Cell>
                <Table.Cell className="text-right tabular-nums">
                  {formatMemory(p.avgPeakRssMb)}
                </Table.Cell>
                <Table.Cell className="text-right text-gray-11">{p.bestRuntime}</Table.Cell>
                <Table.Cell className="text-right">
                  <ScoreBadge score={p.compositeScore} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : (
        <p className="py-6 text-center text-sm text-gray-11">No benchmark data for this device.</p>
      )}
    </div>
  );
};

export default DevicePerformance;
