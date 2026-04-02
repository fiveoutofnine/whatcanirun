import type { Metadata } from 'next';

import { getModelFamily } from './utils';

export async function generateBaseMetadata({
  orgSlug,
  modelSlug,
}: {
  orgSlug: string;
  modelSlug: string;
}): Promise<Metadata> {
  const family = await getModelFamily(orgSlug, modelSlug);
  if (!family) return {};

  const title = `${family.familyName} by ${family.orgName}`;
  const description = `Benchmark results for ${family.familyName}.`;
  const url = `https://whatcani.run/${orgSlug}/${modelSlug}`;

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
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
      creator: '@fiveoutofnine',
      creatorId: '1269561030272643076',
    },
    alternates: {
      canonical: url,
    },
    manifest: '/manifest.json',
  };
}
