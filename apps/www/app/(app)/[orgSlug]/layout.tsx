import type { Metadata } from 'next';
import { Fragment } from 'react';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  const title = `${orgSlug} Models`;
  const description = `Browse all benchmarked models from ${orgSlug}.`;

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
