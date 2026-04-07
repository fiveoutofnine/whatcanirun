import type { Metadata } from 'next';
import { unstable_cache as cache } from 'next/cache';
import { Fragment } from 'react';

import { countDistinct, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { devices, modelFamilies, models, modelsInfo, organizations, runs } from '@/lib/db/schema';
import { formatValueToPrecision } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  const [org, stats] = await Promise.all([
    cache(
      () => db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.slug, orgSlug) }),
      [`org-${orgSlug}`],
      { revalidate: 3600 },
    )(),
    cache(
      async () => {
        const [row] = await db
          .select({
            modelCount: countDistinct(modelFamilies.id),
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
          .innerJoin(modelFamilies, eq(modelsInfo.familyId, modelFamilies.id))
          .innerJoin(organizations, eq(modelFamilies.orgId, organizations.id))
          .where(eq(organizations.slug, orgSlug));
        return row ?? { modelCount: 0, deviceCount: 0, totalTokens: 0 };
      },
      [`org-stats-${orgSlug}`],
      { revalidate: 600 },
    )(),
  ]);

  if (!org) return {};

  const title = `${org.name} Models`;
  const description = `Browse ${stats.modelCount} benchmarked model${stats.modelCount === 1 ? '' : 's'} from ${org.name}, based on real data from ${formatValueToPrecision(stats.totalTokens, 1, true)} token${stats.totalTokens === 1 ? '' : 's'} for ${stats.deviceCount} device${stats.deviceCount === 1 ? '' : 's'}.`;

  const ogImageParams = new URLSearchParams({
    title: org.name,
    description,
    models: String(stats.modelCount),
    devices: String(stats.deviceCount),
    tokens: String(stats.totalTokens),
  });
  if (org.logoUrl)
    ogImageParams.set(
      'logoUrl',
      `https://daimon-assets.fiveoutofnine.com/org_logos/${orgSlug}.jpg`,
    );
  const ogImageUrl = `https://whatcani.run/api/og/model?${ogImageParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://whatcani.run/${orgSlug}`,
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
      canonical: `https://whatcani.run/${orgSlug}`,
    },
    manifest: '/manifest.json',
  };
}

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
