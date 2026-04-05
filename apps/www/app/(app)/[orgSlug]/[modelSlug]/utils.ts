import { unstable_cache as cache } from 'next/cache';

import { and, countDistinct, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { modelFamilies, organizations, view__model_device_summary } from '@/lib/db/schema';

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
        parameters: modelFamilies.parameters,
        license: modelFamilies.license,
        releaseDate: modelFamilies.releaseDate,
        tags: modelFamilies.tags,
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
    const v = view__model_device_summary;
    return db
      .select({
        chipId: v.deviceChipId,
        cpu: sql<string>`MIN(${v.deviceCpu})`.as('cpu'),
        cpuCores: sql<number>`MIN(${v.deviceCpuCores})`.as('cpu_cores'),
        gpu: sql<string>`MIN(${v.deviceGpu})`.as('gpu'),
        gpuCores: sql<number>`MIN(${v.deviceGpuCores})`.as('gpu_cores'),
        ramGb: sql<number>`MIN(${v.deviceRamGb})`.as('ram_gb'),
        modelCount: countDistinct(v.modelId).as('model_count'),
      })
      .from(v)
      .where(eq(v.familyId, familyId))
      .groupBy(v.deviceChipId);
  },
  ['model-family-chips'],
  { revalidate: 600 },
);
