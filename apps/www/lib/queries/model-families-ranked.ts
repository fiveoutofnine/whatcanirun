import { and, count, countDistinct, desc, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  devices,
  modelFamilies,
  models,
  modelsInfo,
  organizations,
  runs,
  RunStatus,
} from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RankedModelFamily = {
  familyId: string;
  familyName: string;
  familySlug: string;
  orgName: string;
  orgSlug: string;
  orgLogoUrl: string | null;
  runCount: number;
  totalTokens: number;
  quantCount: number;
  deviceCount: number;
};

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export async function getRankedModelFamilies(
  offset: number,
  limit: number,
  search?: string,
  orgSlug?: string,
): Promise<RankedModelFamily[]> {
  const pattern = search ? `%${search}%` : undefined;
  const conditions = [eq(runs.status, RunStatus.VERIFIED)];
  if (pattern) {
    conditions.push(or(ilike(modelFamilies.name, pattern), ilike(organizations.name, pattern))!);
  }
  if (orgSlug) {
    conditions.push(eq(organizations.slug, orgSlug));
  }
  const whereClause = and(...conditions);

  return db
    .select({
      familyId: modelFamilies.id,
      familyName: modelFamilies.name,
      familySlug: modelFamilies.slug,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgLogoUrl: organizations.logoUrl,
      runCount: count(runs.id).as('run_count'),
      totalTokens:
        sql<number>`COALESCE(SUM(COALESCE(${runs.promptTokens}, 0) + COALESCE(${runs.completionTokens}, 0)), 0)`.as(
          'total_tokens',
        ),
      quantCount: countDistinct(models.id).as('quant_count'),
      deviceCount: countDistinct(devices.chipId).as('device_count'),
    })
    .from(runs)
    .innerJoin(models, eq(runs.modelId, models.id))
    .innerJoin(devices, eq(runs.deviceId, devices.id))
    .innerJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
    .innerJoin(modelFamilies, eq(modelsInfo.familyId, modelFamilies.id))
    .innerJoin(organizations, eq(modelFamilies.orgId, organizations.id))
    .where(whereClause)
    .groupBy(
      modelFamilies.id,
      modelFamilies.name,
      modelFamilies.slug,
      organizations.name,
      organizations.slug,
      organizations.logoUrl,
    )
    .orderBy(desc(sql`total_tokens`))
    .limit(limit)
    .offset(offset);
}

export async function getRankedModelFamiliesCount(
  search?: string,
  orgSlug?: string,
): Promise<number> {
  const pattern = search ? `%${search}%` : undefined;
  const conditions = [eq(runs.status, RunStatus.VERIFIED)];
  if (pattern) {
    conditions.push(or(ilike(modelFamilies.name, pattern), ilike(organizations.name, pattern))!);
  }
  if (orgSlug) {
    conditions.push(eq(organizations.slug, orgSlug));
  }
  const whereClause = and(...conditions);

  const [row] = await db
    .select({ total: countDistinct(modelFamilies.id) })
    .from(runs)
    .innerJoin(models, eq(runs.modelId, models.id))
    .innerJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
    .innerJoin(modelFamilies, eq(modelsInfo.familyId, modelFamilies.id))
    .innerJoin(organizations, eq(modelFamilies.orgId, organizations.id))
    .where(whereClause);

  return row?.total ?? 0;
}
