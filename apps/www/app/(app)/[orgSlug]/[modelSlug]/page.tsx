import { unstable_cache as cache } from 'next/cache';
import { Fragment } from 'react';

import DeviceFloatingSelector from './(components)/device-floating-selector';
import ModelQuantizationsTable from './(components)/quantizations-table';
import type { Quant } from './(components)/quantizations-table';
import { getModelFamily, getModelFamilyChips } from './utils';
import { eq, inArray } from 'drizzle-orm';
import { File } from 'lucide-react';

import { db } from '@/lib/db';
import { modelsInfo, view__model_stats_by_device } from '@/lib/db/schema';

import { H2 } from '@/components/templates/mdx';
import StateInfo from '@/components/templates/state-info';

export default async function ModelFamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
  searchParams: Promise<{ device?: string }>;
}) {
  const { orgSlug, modelSlug } = await params;
  const { device: deviceParam } = await searchParams;

  // We handle the not found case in the layout.
  const family = (await getModelFamily(orgSlug, modelSlug))!;
  const { members, stats } = await cache(
    async () => {
      const members = await db.query.modelsInfo.findMany({
        where: eq(modelsInfo.familyId, family.familyId),
        with: { model: true, quantizedBy: true },
      });

      const modelIds = members.flatMap((m) => (m.model ? [m.model.id] : []));

      if (modelIds.length === 0) return { members, stats: [] };

      const stats = await db
        .select()
        .from(view__model_stats_by_device)
        .where(inArray(view__model_stats_by_device.modelId, modelIds));

      return { members, stats };
    },
    ['model-family-data', family.familyId],
    { revalidate: 600 },
  )();

  if (members.length === 0 || stats.length === 0) {
    return (
      <div className="flex grow flex-col p-4 md:px-0 md:py-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-xl border border-gray-6 bg-gray-2 px-4 py-12">
          <StateInfo
            size="sm"
            title="No benchmark results found"
            description="No benchmark results yet for this model family."
            icon={<File />}
          />
        </div>
      </div>
    );
  }

  // Effective device.
  const chips = await getModelFamilyChips(family.familyId);
  const chipIds = new Set(chips.map((c) => c.chipId));
  const sortedChips = [...chips].sort((a, b) => b.modelCount - a.modelCount);
  const effectiveDevice =
    deviceParam !== undefined && chipIds.has(deviceParam)
      ? deviceParam
      : (sortedChips[0]?.chipId ?? '');

  // Best score by model for device
  const bestScoreByModel = new Map<string, number>();
  for (const row of stats) {
    if (row.deviceChipId !== effectiveDevice) continue;
    const existing = bestScoreByModel.get(row.modelId);
    if (existing === undefined || row.compositeScore > existing) {
      bestScoreByModel.set(row.modelId, row.compositeScore);
    }
  }

  // Quantizations
  const quants: Quant[] = members
    .filter((m) => m.model !== null)
    .map((m) => ({
      modelId: m.model!.id,
      quant: m.quant || m.model!.quant,
      format: m.model!.format,
      fileSizeBytes: m.fileSizeBytes || m.model!.fileSizeBytes || null,
      source: m.source || m.model!.source,
      quantizedBy: m.quantizedBy,
      score: bestScoreByModel.get(m.model!.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.fileSizeBytes == null && b.fileSizeBytes == null) return 0;
      if (a.fileSizeBytes == null) return 1;
      if (b.fileSizeBytes == null) return -1;
      return a.fileSizeBytes - b.fileSizeBytes;
    });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Fragment>
      <div className="flex grow md:px-6">
        <div className="mx-auto flex w-full max-w-5xl grow flex-col py-4 md:py-6">
          <H2 className="mb-2 px-4 md:px-0">Quantizations</H2>
          <ModelQuantizationsTable quants={quants} />
          <H2 className="mb-2 mt-4 px-4 md:mt-8 md:px-0">Performance</H2>
          <div className="flex w-full flex-col gap-2 md:flex-row">
            <div className="h-64 w-full border-y border-gray-6 bg-gray-2 md:rounded-xl md:border-x" />
            <div className="h-64 w-full border-y border-gray-6 bg-gray-2 md:rounded-xl md:border-x" />
          </div>
        </div>
      </div>
      <DeviceFloatingSelector chips={chips} />
    </Fragment>
  );
}
