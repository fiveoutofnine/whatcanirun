import { unstable_cache as cache } from 'next/cache';

import { and, countDistinct, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  modelFamilies,
  models,
  modelsInfo,
  organizations,
  type Organization,
  view__model_device_summary,
} from '@/lib/db/schema';
import { getModelGroupKey } from '@/lib/utils/model-grouping';

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
        gpuCount: sql<number>`MIN(${v.deviceGpuCount})`.as('gpu_count'),
        ramGb: sql<number>`MIN(${v.deviceRamGb})`.as('ram_gb'),
        modelCount: countDistinct(v.modelGroupKey).as('model_count'),
      })
      .from(v)
      .where(eq(v.familyId, familyId))
      .groupBy(v.deviceChipId);
  },
  ['model-family-chips'],
  { revalidate: 600 },
);

export type ModelFamilyMember = typeof modelsInfo.$inferSelect & {
  model: typeof models.$inferSelect | null;
  quantizedBy: Organization | null;
};

export function groupModelFamilyMembers(members: ModelFamilyMember[]) {
  const grouped = new Map<string, ModelFamilyMember>();

  for (const member of members) {
    if (!member.model) continue;

    const modelGroupKey = getModelGroupKey({
      artifactSha256: member.model.artifactSha256,
      modelSource: member.model.source,
      modelsInfoSource: member.source,
    });
    const existing = grouped.get(modelGroupKey);

    if (!existing || isNewerModel(member.model, existing.model)) {
      grouped.set(modelGroupKey, member);
    }
  }

  return [...grouped.entries()].map(([modelGroupKey, member]) => ({
    modelGroupKey,
    member,
  }));
}

function isNewerModel(
  left: typeof models.$inferSelect,
  right: typeof models.$inferSelect | null,
): boolean {
  if (!right) return true;

  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();

  if (leftTime !== rightTime) return leftTime > rightTime;
  return left.id > right.id;
}
