import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import { generateBaseMetadata } from './generate-base-metadata';
import { getModelFamily } from './utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
  children: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, modelSlug } = await params;
  return generateBaseMetadata({ orgSlug, modelSlug });
}

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default async function Layout({ params, children }: Props) {
  const { orgSlug, modelSlug } = await params;
  const family = await getModelFamily(orgSlug, modelSlug);

  if (!family) notFound();

  return <Fragment>{children}</Fragment>;
}
