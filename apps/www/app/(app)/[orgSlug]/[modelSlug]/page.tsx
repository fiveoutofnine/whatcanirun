import DeviceSection from './(components)/device-section';
import type { ChipOption } from './(components)/device-section';
import PerformanceChart from './(components)/performance-chart';
import type { ChartPoint } from './(components)/performance-chart';
import ModelQuantizationsTable from './(components)/quantizations-table';
import type { Variant } from './(components)/quantizations-table';
import { getModelFamily } from './utils';
import { eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/lib/db';
import { models, modelsInfo, organizations, view__model_stats_by_device } from '@/lib/db/schema';

import { H2 } from '@/components/templates/mdx';

type DevicePerf = {
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

export default async function ModelFamilyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
}) {
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

  const quantOrg = alias(organizations, 'quant_org_page');
  const allMembers =
    modelIds.length > 0
      ? await db
          .select({
            modelId: models.id,
            modelQuant: models.quant,
            modelFormat: models.format,
            modelFileSizeBytes: models.fileSizeBytes,
            modelSource: models.source,
            infoQuant: modelsInfo.quant,
            infoSource: modelsInfo.source,
            infoFileSizeBytes: modelsInfo.fileSizeBytes,
            quantizedByName: quantOrg.name,
            quantizedByLogoUrl: quantOrg.logoUrl,
          })
          .from(models)
          .innerJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
          .leftJoin(quantOrg, eq(modelsInfo.quantizedById, quantOrg.id))
          .where(inArray(models.id, modelIds))
      : [];

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
  // 1. Build chip options from stats
  // ---------------------------------------------------------------------------

  const chipInfoMap = new Map<
    string,
    { chipId: string; cpu: string; cpuCores: number; gpu: string; gpuCores: number; ramGb: number }
  >();
  const chipModelSets = new Map<string, Set<string>>();

  for (const row of stats) {
    if (!chipInfoMap.has(row.deviceChipId)) {
      chipInfoMap.set(row.deviceChipId, {
        chipId: row.deviceChipId,
        cpu: row.deviceCpu,
        cpuCores: row.deviceCpuCores,
        gpu: row.deviceGpu,
        gpuCores: row.deviceGpuCores,
        ramGb: row.deviceRamGb,
      });
    }
    let modelSet = chipModelSets.get(row.deviceChipId);
    if (!modelSet) {
      modelSet = new Set();
      chipModelSets.set(row.deviceChipId, modelSet);
    }
    modelSet.add(row.modelId);
  }

  const chips: ChipOption[] = [...chipInfoMap.entries()].map(([chipId, info]) => ({
    ...info,
    modelCount: chipModelSets.get(chipId)?.size ?? 0,
  }));

  const sortedChips = [...chips].sort((a, b) => b.modelCount - a.modelCount);
  const defaultDevice = sortedChips[0]?.chipId ?? '';

  // ---------------------------------------------------------------------------
  // 2. Build variants (aggregated across ALL devices)
  // ---------------------------------------------------------------------------

  const variantAgg = new Map<string, { totalTrials: number; devices: Set<string> }>();
  for (const row of stats) {
    let agg = variantAgg.get(row.modelId);
    if (!agg) {
      agg = { totalTrials: 0, devices: new Set() };
      variantAgg.set(row.modelId, agg);
    }
    agg.totalTrials += row.trialCount;
    agg.devices.add(row.deviceChipId);
  }

  const variants: Variant[] = allMembers
    .map((m) => {
      const agg = variantAgg.get(m.modelId);
      return {
        modelId: m.modelId,
        quant: m.infoQuant || m.modelQuant,
        format: m.modelFormat,
        fileSizeBytes: m.infoFileSizeBytes || m.modelFileSizeBytes || null,
        source: m.infoSource || m.modelSource,
        quantizedBy: m.quantizedByName
          ? { name: m.quantizedByName, logoUrl: m.quantizedByLogoUrl }
          : null,
        totalTrials: agg?.totalTrials ?? 0,
        deviceCount: agg?.devices.size ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.fileSizeBytes == null && b.fileSizeBytes == null) return 0;
      if (a.fileSizeBytes == null) return 1;
      if (b.fileSizeBytes == null) return -1;
      return a.fileSizeBytes - b.fileSizeBytes;
    });

  // ---------------------------------------------------------------------------
  // 3. Build performance data per device (for client-side device switching)
  // ---------------------------------------------------------------------------

  const perfsByDevice: Record<string, DevicePerf[]> = {};

  for (const chip of chips) {
    const deviceRows = stats.filter((row) => row.deviceChipId === chip.chipId);
    const bestByModel = new Map<string, (typeof stats)[number]>();
    for (const row of deviceRows) {
      const existing = bestByModel.get(row.modelId);
      if (!existing || row.compositeScore > existing.compositeScore) {
        bestByModel.set(row.modelId, row);
      }
    }
    perfsByDevice[chip.chipId] = [...bestByModel.values()].map((row) => ({
      modelId: row.modelId,
      quant: row.modelQuant,
      format: row.modelFormat,
      compositeScore: row.compositeScore,
      bestRuntime: row.runtimeName,
      avgDecodeTps: Number(row.avgDecodeTps),
      avgPrefillTps: Number(row.avgPrefillTps),
      ttftP50Ms: Number(row.ttftP50Ms),
      avgPeakRssMb: row.avgPeakRssMb ? Number(row.avgPeakRssMb) : null,
    }));
  }

  // ---------------------------------------------------------------------------
  // 4. Build chart data (all devices)
  // ---------------------------------------------------------------------------

  // For each (model, device) pair, pick the runtime with the best composite score
  const bestByModelDevice = new Map<string, (typeof stats)[number]>();
  for (const row of stats) {
    const key = `${row.modelId}::${row.deviceChipId}`;
    const existing = bestByModelDevice.get(key);
    if (!existing || row.compositeScore > existing.compositeScore) {
      bestByModelDevice.set(key, row);
    }
  }

  const chartData: ChartPoint[] = [...bestByModelDevice.values()].map((row) => {
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
    <div className="flex grow md:px-6">
      <div className="mx-auto flex w-full max-w-5xl grow flex-col py-4 md:py-6">
        <H2 className="mb-2 px-4 md:px-0" link={false}>
          Quantizations
        </H2>
        <ModelQuantizationsTable variants={variants} />

        <DeviceSection chips={chips} perfsByDevice={perfsByDevice} defaultDevice={defaultDevice} />

        <H2 className="mb-2 mt-4 px-4 md:mt-8 md:px-0" link={false}>
          Speed
        </H2>
        <PerformanceChart data={chartData} />
      </div>
    </div>
  );
}
