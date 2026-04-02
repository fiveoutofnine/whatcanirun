import type { view__model_stats_by_device } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type DeviceStats = (typeof view__model_stats_by_device.$inferSelect)[];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function DeviceStatsTable({ rows }: { rows: DeviceStats }) {
  const device = rows[0];

  return (
    <section>
      <h2 className="mb-2 text-lg font-medium">
        {device.deviceGpu || device.deviceCpu}{' '}
        <span className="text-sm font-normal text-gray-11">({device.deviceRamGb} GB)</span>
      </h2>
      <div className="overflow-x-auto rounded-xl border border-gray-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-6 text-left text-gray-11">
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 font-medium">Quant</th>
              <th className="px-4 py-2 font-medium">Runtime</th>
              <th className="px-4 py-2 text-right font-medium">Decode</th>
              <th className="px-4 py-2 text-right font-medium">Prefill</th>
              <th className="px-4 py-2 text-right font-medium">TTFT</th>
              <th className="px-4 py-2 text-right font-medium">Peak mem</th>
              <th className="px-4 py-2 text-right font-medium">Trials</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.modelId}-${row.runtimeName}`}
                className="border-b border-gray-6 last:border-0"
              >
                <td className="px-4 py-2">{row.modelDisplayName}</td>
                <td className="px-4 py-2 text-gray-11">{row.modelQuant ?? '—'}</td>
                <td className="px-4 py-2">{row.runtimeName}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {Number(row.avgDecodeTps).toFixed(1)} tok/s
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {Number(row.avgPrefillTps).toFixed(1)} tok/s
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.ttftP50Ms < 4000
                    ? `${Number(row.ttftP50Ms).toFixed(0)} ms`
                    : `${(row.ttftP50Ms / 1000).toFixed(2)} sec`}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.avgPeakRssMb ? `${(row.avgPeakRssMb / 1024).toFixed(2)} GB` : '—'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{row.trialCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
