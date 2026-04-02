import { getModelFamily } from './utils';
import { eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { models, modelsInfo, view__model_stats_by_device } from '@/lib/db/schema';

import ContainerLayout from '@/components/layouts/container';
import UserAvatar from '@/components/templates/user-avatar';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
};

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function ModelFamilyPage({ params }: Props) {
  const { orgSlug, modelSlug } = await params;
  const family = (await getModelFamily(orgSlug, modelSlug))!;

  // Find all model IDs in this family
  const memberRows = await db
    .select({ modelId: models.id })
    .from(modelsInfo)
    .innerJoin(models, eq(modelsInfo.artifactSha256, models.artifactSha256))
    .where(eq(modelsInfo.familyId, family.familyId));

  const modelIds = memberRows.map((r) => r.modelId);

  // Query materialized view for these models
  const stats =
    modelIds.length > 0
      ? await db
          .select()
          .from(view__model_stats_by_device)
          .where(inArray(view__model_stats_by_device.modelId, modelIds))
      : [];

  // Group stats by device chip
  const byDevice = new Map<string, typeof stats>();
  for (const row of stats) {
    const key = row.deviceChipId;
    if (!byDevice.has(key)) byDevice.set(key, []);
    byDevice.get(key)!.push(row);
  }

  // Aggregate totals
  const totalRuns = stats.reduce((sum, r) => sum + r.runCount, 0);
  const totalTrials = stats.reduce((sum, r) => sum + r.trialCount, 0);
  const uniqueQuants = new Set(stats.map((r) => r.modelQuant).filter(Boolean));
  const uniqueDevices = byDevice.size;

  return (
    <ContainerLayout className="flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        {family.orgLogoUrl && (
          <UserAvatar image={family.orgLogoUrl} name={family.orgName} size={40} />
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{family.familyName}</h1>
          <p className="text-sm text-gray-11">
            by{' '}
            {family.orgWebsiteUrl ? (
              <a
                className="underline decoration-dotted hover:text-gray-12"
                href={family.orgWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {family.orgName}
              </a>
            ) : (
              family.orgName
            )}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Quantizations" value={uniqueQuants.size} />
        <SummaryCard label="Devices" value={uniqueDevices} />
        <SummaryCard label="Runs" value={totalRuns} />
        <SummaryCard label="Trials" value={totalTrials} />
      </div>

      {/* Stats by device */}
      {modelIds.length === 0 ? (
        <p className="py-12 text-center text-gray-11">
          No models have been linked to this family yet.
        </p>
      ) : stats.length === 0 ? (
        <p className="py-12 text-center text-gray-11">
          No benchmark results yet for this model family.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {[...byDevice.entries()].map(([chipId, rows]) => {
            const device = rows[0];
            return (
              <section key={chipId}>
                <h2 className="mb-2 text-lg font-medium">
                  {device.deviceGpu || device.deviceCpu}{' '}
                  <span className="text-sm font-normal text-gray-11">
                    ({device.deviceRamGb} GB)
                  </span>
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
          })}
        </div>
      )}
    </ContainerLayout>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-6 px-4 py-3">
      <p className="text-sm text-gray-11">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
