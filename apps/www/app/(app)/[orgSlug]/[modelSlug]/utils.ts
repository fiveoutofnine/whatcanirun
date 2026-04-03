import { unstable_cache as cache } from 'next/cache';

import { and, countDistinct, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  modelFamilies,
  modelsInfo,
  organizations,
  view__model_stats_by_device,
} from '@/lib/db/schema';

export const getModelFamily = cache(
  async (orgSlug: string, modelSlug: string) => {
    const [row] = await db
      .select({
        familyId: modelFamilies.id,
        familyName: modelFamilies.name,
        orgName: organizations.name,
        orgLogoUrl: organizations.logoUrl,
        orgSlug: organizations.slug,
        orgWebsiteUrl: organizations.websiteUrl,
      })
      .from(modelFamilies)
      .innerJoin(organizations, eq(modelFamilies.orgId, organizations.id))
      .where(and(eq(organizations.slug, orgSlug), eq(modelFamilies.slug, modelSlug)))
      .limit(1);

    return row ?? null;
  },
  ['model-family'],
  { revalidate: 3_600 },
);

export const getModelFamilyChips = cache(
  async (familyId: string) => {
    const members = await db.query.modelsInfo.findMany({
      where: eq(modelsInfo.familyId, familyId),
      with: { model: { columns: { id: true } } },
    });

    const modelIds = members.flatMap((m) => (m.model ? [m.model.id] : []));
    if (modelIds.length === 0) return [];

    const rows = await db
      .select({
        chipId: view__model_stats_by_device.deviceChipId,
        cpu: sql<string>`MIN(${view__model_stats_by_device.deviceCpu})`.as('cpu'),
        cpuCores: sql<number>`MIN(${view__model_stats_by_device.deviceCpuCores})`.as('cpu_cores'),
        gpu: sql<string>`MIN(${view__model_stats_by_device.deviceGpu})`.as('gpu'),
        gpuCores: sql<number>`MIN(${view__model_stats_by_device.deviceGpuCores})`.as('gpu_cores'),
        ramGb: sql<number>`MIN(${view__model_stats_by_device.deviceRamGb})`.as('ram_gb'),
        modelCount: countDistinct(view__model_stats_by_device.modelId).as('model_count'),
      })
      .from(view__model_stats_by_device)
      .where(inArray(view__model_stats_by_device.modelId, modelIds))
      .groupBy(view__model_stats_by_device.deviceChipId);

    return rows.map((r) => ({
      chipId: r.chipId,
      cpu: r.cpu,
      cpuCores: r.cpuCores,
      gpu: r.gpu,
      gpuCores: r.gpuCores,
      ramGb: r.ramGb,
      modelCount: r.modelCount,
    }));
  },
  ['model-family-chips'],
  { revalidate: 600 },
);
