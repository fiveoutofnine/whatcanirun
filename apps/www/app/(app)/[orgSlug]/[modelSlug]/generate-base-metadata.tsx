import type { Metadata } from 'next';
import { unstable_cache as cache } from 'next/cache';

import { getModelFamily } from './utils';
import { countDistinct, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { devices, models, modelsInfo, runs } from '@/lib/db/schema';

export async function generateBaseMetadata({
  orgSlug,
  modelSlug,
}: {
  orgSlug: string;
  modelSlug: string;
}): Promise<Metadata> {
  const family = await getModelFamily(orgSlug, modelSlug);
  if (!family) return {};

  const stats = await cache(
    async () => {
      const [row] = await db
        .select({
          quantCount: countDistinct(models.quant),
          deviceCount: countDistinct(devices.chipId),
          totalTokens:
            sql<number>`COALESCE(SUM(COALESCE(${runs.promptTokens}, 0) + COALESCE(${runs.completionTokens}, 0)), 0)`.as(
              'total_tokens',
            ),
        })
        .from(runs)
        .innerJoin(models, eq(runs.modelId, models.id))
        .innerJoin(devices, eq(runs.deviceId, devices.id))
        .innerJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
        .where(eq(modelsInfo.familyId, family.familyId));
      return row ?? { quantCount: 0, deviceCount: 0, totalTokens: 0 };
    },
    [`model-family-stats-${family.familyId}`],
    { revalidate: 600 },
  )();

  const title = `${family.familyName} by ${family.orgName}`;
  const description = `Browse benchmarks of ${stats.quantCount} quant${stats.quantCount === 1 ? '' : 's'} across ${stats.deviceCount} device${stats.deviceCount === 1 ? '' : 's'} for ${family.familyName} by ${family.orgName}.`;
  const url = `https://whatcani.run/${orgSlug}/${modelSlug}`;

  const ogImageParams = new URLSearchParams({
    title: family.familyName,
    description,
    quants: String(stats.quantCount),
    devices: String(stats.deviceCount),
    tokens: String(stats.totalTokens),
  });
  if (family.orgLogoUrl)
    ogImageParams.set(
      'logoUrl',
      `https://daimon-assets.fiveoutofnine.com/org_logos/${family.orgSlug}.jpg`,
    );
  const ogImageUrl = `https://whatcani.run/api/og/model?${ogImageParams.toString()}`;

  return {
    title: {
      absolute: `${title} | whatcani.run`,
    },
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'whatcani.run',
      locale: 'en_US',
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
      creator: '@fiveoutofnine',
      creatorId: '1269561030272643076',
      images: [ogImageUrl],
    },
    alternates: {
      canonical: url,
    },
    manifest: '/manifest.json',
  };
}
