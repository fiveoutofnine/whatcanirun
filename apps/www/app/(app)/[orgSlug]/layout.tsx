import type { Metadata } from 'next';
import { unstable_cache as cache } from 'next/cache';
import { Fragment } from 'react';

import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  const org = await cache(
    () => db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.slug, orgSlug) }),
    [`org-${orgSlug}`],
    { revalidate: 3600 },
  )();

  if (!org) return {};

  const title = `${org.name} Models`;
  const description = `Browse all benchmarked models from ${org.name}.`;

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
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
      creator: '@fiveoutofnine',
      creatorId: '1269561030272643076',
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
