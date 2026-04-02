import DevicePerformance from './(components)/device-performance';
import type { DevicePerformanceData } from './(components)/device-performance';
import PerformanceChart from './(components)/performance-chart';
import type { ChartPoint } from './(components)/performance-chart';
import VariantsTable from './(components)/variants-table';
import type { Variant } from './(components)/variants-table';
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

  const memberRows = await db
    .select({ modelId: models.id })
    .from(modelsInfo)
    .innerJoin(models, eq(modelsInfo.artifactSha256, models.artifactSha256))
    .where(eq(modelsInfo.familyId, family.familyId));

  const modelIds = memberRows.map((r) => r.modelId);

  const stats =
    modelIds.length > 0
      ? await db
          .select()
          .from(view__model_stats_by_device)
          .where(inArray(view__model_stats_by_device.modelId, modelIds))
      : [];

  if (modelIds.length === 0) {
    return (
      <div className="flex grow flex-col py-4 md:py-6">
        <p className="mx-auto max-w-7xl px-4 py-12 text-center text-gray-11 md:px-6">
          No models have been linked to this family yet.
        </p>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex grow flex-col py-4 md:py-6">
        <p className="mx-auto max-w-7xl px-4 py-12 text-center text-gray-11 md:px-6">
          No benchmark results yet for this model family.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1. Build variants list (deduplicated per model)
  // ---------------------------------------------------------------------------

  const variantMap = new Map<string, Variant>();
  for (const row of stats) {
    if (variantMap.has(row.modelId)) continue;
    variantMap.set(row.modelId, {
      modelId: row.modelId,
      quant: row.modelQuant,
      format: row.modelFormat,
      fileSizeBytes: row.modelFileSizeBytes ? Number(row.modelFileSizeBytes) : null,
      parameters: row.modelParameters,
      source: row.modelSource,
      quantizedBy: row.quantizedByName
        ? { name: row.quantizedByName, logoUrl: row.quantizedByLogoUrl }
        : null,
    });
  }

  const variants = [...variantMap.values()].sort((a, b) => {
    if (a.fileSizeBytes == null && b.fileSizeBytes == null) return 0;
    if (a.fileSizeBytes == null) return 1;
    if (b.fileSizeBytes == null) return -1;
    return a.fileSizeBytes - b.fileSizeBytes;
  });

  // ---------------------------------------------------------------------------
  // 2. Build device performance data
  // ---------------------------------------------------------------------------

  const deviceMap = new Map<
    string,
    { chipId: string; cpu: string; cpuCores: number; gpu: string; gpuCores: number; ramGb: number }
  >();
  for (const row of stats) {
    if (!deviceMap.has(row.deviceChipId)) {
      deviceMap.set(row.deviceChipId, {
        chipId: row.deviceChipId,
        cpu: row.deviceCpu,
        cpuCores: row.deviceCpuCores,
        gpu: row.deviceGpu,
        gpuCores: row.deviceGpuCores,
        ramGb: row.deviceRamGb,
      });
    }
  }
  const devices = [...deviceMap.values()];

  // For each (modelId, deviceChipId), pick best composite score runtime
  const cellKey = (modelId: string, chipId: string) => `${modelId}::${chipId}`;
  const bestByCell = new Map<string, (typeof stats)[number]>();
  for (const row of stats) {
    const key = cellKey(row.modelId, row.deviceChipId);
    const existing = bestByCell.get(key);
    if (!existing || row.compositeScore > existing.compositeScore) {
      bestByCell.set(key, row);
    }
  }

  const perfByDevice: Record<string, DevicePerformanceData['perfByDevice'][string]> = {};
  for (const [, row] of bestByCell) {
    const chipId = row.deviceChipId;
    if (!perfByDevice[chipId]) perfByDevice[chipId] = [];
    perfByDevice[chipId].push({
      modelId: row.modelId,
      quant: row.modelQuant,
      format: row.modelFormat,
      compositeScore: row.compositeScore,
      bestRuntime: row.runtimeName,
      avgDecodeTps: Number(row.avgDecodeTps),
      avgPrefillTps: Number(row.avgPrefillTps),
      ttftP50Ms: Number(row.ttftP50Ms),
      avgPeakRssMb: row.avgPeakRssMb ? Number(row.avgPeakRssMb) : null,
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Build chart data
  // ---------------------------------------------------------------------------

  const chartData: ChartPoint[] = [...bestByCell.values()].map((row) => {
    const gpu = row.deviceGpu;
    const manufacturer = gpu.split(' ')[0];
    return {
      id: `${row.modelId}::${row.deviceChipId}`,
      quant: row.modelQuant,
      format: row.modelFormat,
      deviceLabel: `${gpu} (${row.deviceRamGb} GB)`,
      deviceManufacturer: manufacturer,
      avgDecodeTps: Number(row.avgDecodeTps),
      avgPrefillTps: Number(row.avgPrefillTps),
      compositeScore: row.compositeScore,
      bestRuntime: row.runtimeName,
      ttftP50Ms: Number(row.ttftP50Ms),
      avgPeakRssMb: row.avgPeakRssMb ? Number(row.avgPeakRssMb) : null,
    };
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex grow flex-col gap-8 py-4 md:py-6">
      {/* Section 1: Model Variants */}
      <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <h2 className="mb-3 text-base font-medium tracking-tight text-gray-12">
          Available variants
        </h2>
        <VariantsTable variants={variants} />
      </section>

      {/* Section 2: Device Performance */}
      <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <h2 className="mb-3 text-base font-medium tracking-tight text-gray-12">
          Performance by device
        </h2>
        <DevicePerformance devices={devices} perfByDevice={perfByDevice} />
      </section>

      {/* Section 3: Prefill vs Decode Chart */}
      <section className="mx-auto w-full max-w-7xl">
        <PerformanceChart data={chartData} />
      </section>
    </div>
  );
}
