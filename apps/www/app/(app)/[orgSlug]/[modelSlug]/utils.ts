import { unstable_cache as cache } from 'next/cache';

import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { modelFamilies, organizations } from '@/lib/db/schema';

export type ModelFamilyData = {
  familyId: string;
  familyName: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgSlug: string;
  orgWebsiteUrl: string | null;
};

export const getModelFamily = cache(
  async (orgSlug: string, modelSlug: string): Promise<ModelFamilyData | null> => {
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
