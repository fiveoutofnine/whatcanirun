import ModelQuantizationsTable from './(components)/quantizations-table';
import type { Variant } from './(components)/quantizations-table';
import { getModelFamily, getModelFamilyChips } from './utils';
import { eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/lib/db';
import { models, modelsInfo, organizations, view__model_stats_by_device } from '@/lib/db/schema';

import { H2 } from '@/components/templates/mdx';

export default async function ModelFamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
  searchParams: Promise<{ device?: string }>;
}) {
  const { orgSlug, modelSlug } = await params;
  const { device: deviceParam } = await searchParams;
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
  // Determine effective device
  // ---------------------------------------------------------------------------

  const chips = await getModelFamilyChips(family.familyId);
  const chipIds = new Set(chips.map((c) => c.chipId));
  const sortedChips = [...chips].sort((a, b) => b.modelCount - a.modelCount);
  const effectiveDevice =
    deviceParam !== undefined && chipIds.has(deviceParam)
      ? deviceParam
      : (sortedChips[0]?.chipId ?? '');

  // ---------------------------------------------------------------------------
  // Build best score per model on the selected device
  // ---------------------------------------------------------------------------

  const bestScoreByModel = new Map<string, number>();
  for (const row of stats) {
    if (row.deviceChipId !== effectiveDevice) continue;
    const existing = bestScoreByModel.get(row.modelId);
    if (existing === undefined || row.compositeScore > existing) {
      bestScoreByModel.set(row.modelId, row.compositeScore);
    }
  }

  // ---------------------------------------------------------------------------
  // Build variants
  // ---------------------------------------------------------------------------

  const variants: Variant[] = allMembers
    .map((m) => ({
      modelId: m.modelId,
      quant: m.infoQuant || m.modelQuant,
      format: m.modelFormat,
      fileSizeBytes: m.infoFileSizeBytes || m.modelFileSizeBytes || null,
      source: m.infoSource || m.modelSource,
      quantizedBy: m.quantizedByName
        ? { name: m.quantizedByName, logoUrl: m.quantizedByLogoUrl }
        : null,
      score: bestScoreByModel.get(m.modelId) ?? null,
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
    <div className="flex grow md:px-6">
      <div className="mx-auto flex w-full max-w-5xl grow flex-col py-4 md:py-6">
        <H2 className="mb-2 px-4 md:px-0" link={false}>
          Quantizations
        </H2>
        <ModelQuantizationsTable variants={variants} />
      </div>
    </div>
  );
}
