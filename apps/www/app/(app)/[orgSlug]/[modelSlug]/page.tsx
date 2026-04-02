import DeviceStatsTable from './(components)/device-stats-table';
import SummaryCard from './(components)/summary-card';
import { getModelFamily } from './utils';
import { eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { models, modelsInfo, view__model_stats_by_device } from '@/lib/db/schema';

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

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  // Find all model IDs in this family.
  const memberRows = await db
    .select({ modelId: models.id })
    .from(modelsInfo)
    .innerJoin(models, eq(modelsInfo.artifactSha256, models.artifactSha256))
    .where(eq(modelsInfo.familyId, family.familyId));

  const modelIds = memberRows.map((r) => r.modelId);

  // Query materialized view for these models.
  const stats =
    modelIds.length > 0
      ? await db
          .select()
          .from(view__model_stats_by_device)
          .where(inArray(view__model_stats_by_device.modelId, modelIds))
      : [];

  // ---------------------------------------------------------------------------
  // Aggregations
  // ---------------------------------------------------------------------------

  // Group stats by device chip.
  const byDevice = new Map<string, typeof stats>();
  for (const row of stats) {
    const key = row.deviceChipId;
    if (!byDevice.has(key)) byDevice.set(key, []);
    byDevice.get(key)!.push(row);
  }

  const totalRuns = stats.reduce((sum, r) => sum + r.runCount, 0);
  const totalTrials = stats.reduce((sum, r) => sum + r.trialCount, 0);
  const uniqueQuants = new Set(stats.map((r) => r.modelQuant).filter(Boolean));
  const uniqueDevices = byDevice.size;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex grow flex-col py-4 md:py-6">
      {/* Summary stats */}
      <div
        className="hide-scrollbar scroll-overflow-indicators mx-auto flex w-full max-w-[83rem] snap-x scroll-px-4 gap-2 overflow-x-scroll px-4 md:scroll-px-6 md:px-6"
        tabIndex={-1}
      >
        <SummaryCard label="Quantizations" value={uniqueQuants.size} />
        <SummaryCard label="Devices" value={uniqueDevices} />
        <SummaryCard label="Runs" value={totalRuns} />
        <SummaryCard label="Trials" value={totalTrials} />
      </div>

      {/* Stats by device */}
      <div className="w-full md:px-6">
        {modelIds.length === 0 ? (
          <p className="mx-auto max-w-7xl py-12 text-center text-gray-11">
            No models have been linked to this family yet.
          </p>
        ) : stats.length === 0 ? (
          <p className="mx-auto max-w-7xl py-12 text-center text-gray-11">
            No benchmark results yet for this model family.
          </p>
        ) : (
          <div className="mx-auto mt-4 flex w-full max-w-7xl flex-col gap-8 md:mt-8">
            {[...byDevice.entries()].map(([chipId, rows]) => (
              <DeviceStatsTable key={chipId} rows={rows} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
