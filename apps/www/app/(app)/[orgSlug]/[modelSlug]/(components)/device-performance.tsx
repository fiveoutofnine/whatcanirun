import ScoreBadge from '@/components/templates/score-badge';
import { MemoryTableCell, RuntimeTableCell } from '@/components/templates/table-cells';
import { Table } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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
  perfs: VariantPerf[];
  deviceRamGb: number;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const DevicePerformance: React.FC<DevicePerformanceProps> = ({ perfs, deviceRamGb }) => {
  const sorted = [...perfs].sort((a, b) => b.compositeScore - a.compositeScore);

  if (sorted.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-11">No benchmark data for this device.</p>
    );
  }

  return (
    <Table.Root containerClassName="hidden md:block border border-gray-6 rounded-xl hide-scrollbar [&>table]:border-0">
      <Table.Header>
        <Table.Row>
          <Table.Head>Variant</Table.Head>
          <Table.Head>Runtime</Table.Head>
          <Table.Head className="text-right">Decode</Table.Head>
          <Table.Head className="text-right">Prefill</Table.Head>
          <Table.Head className="text-right">TTFT (p50)</Table.Head>
          <Table.Head>Peak memory</Table.Head>
          <Table.Head className="text-right">Score</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sorted.map((p) => (
          <Table.Row key={p.modelId}>
            <Table.Cell className="font-medium">{p.quant ?? p.format}</Table.Cell>
            <Table.Cell>
              <RuntimeTableCell runtimeName={p.bestRuntime} />
            </Table.Cell>
            <Table.Cell className="text-right">
              <div className="min-w-fit text-nowrap text-right tabular-nums">
                {Number(p.avgDecodeTps).toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{' '}
                <span className="text-gray-11">tok/s</span>
              </div>
            </Table.Cell>
            <Table.Cell className="text-right">
              <div className="min-w-fit text-nowrap text-right tabular-nums">
                {Number(p.avgPrefillTps).toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{' '}
                <span className="text-gray-11">tok/s</span>
              </div>
            </Table.Cell>
            <Table.Cell className="text-right">
              {p.ttftP50Ms < 4_000 ? (
                <div className="min-w-fit text-nowrap text-right tabular-nums">
                  {Number(p.ttftP50Ms).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{' '}
                  <span className="text-gray-11">ms</span>
                </div>
              ) : (
                <div className="min-w-fit text-nowrap text-right tabular-nums">
                  {Number(p.ttftP50Ms / 1_000).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2,
                  })}{' '}
                  <span className="text-gray-11">sec</span>
                </div>
              )}
            </Table.Cell>
            <Table.Cell>
              {p.avgPeakRssMb != null ? (
                <MemoryTableCell
                  align="left"
                  usedGb={p.avgPeakRssMb / 1024}
                  totalGb={deviceRamGb}
                />
              ) : (
                <span className="italic text-gray-11">N/A</span>
              )}
            </Table.Cell>
            <Table.Cell className="text-right">
              <div className="flex justify-end">
                <ScoreBadge score={p.compositeScore} />
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export default DevicePerformance;
