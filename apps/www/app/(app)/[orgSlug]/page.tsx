import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import {
  getRankedModelFamilies,
  getRankedModelFamiliesCount,
} from '@/lib/queries/model-families-ranked';

import ContainerLayout from '@/components/layouts/container';
import { H1 } from '@/components/templates/mdx';
import ModelFamiliesList from '@/components/templates/model-family-list';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PAGE_SIZE = 15;

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgSlug } = await params;
  const { q } = await searchParams;
  const search = q?.trim() || undefined;

  const [initialData, searchTotal, total] = await Promise.all([
    cache(
      () => getRankedModelFamilies(0, PAGE_SIZE, search, orgSlug),
      [`model-families-ranked-0-${PAGE_SIZE}-${search ?? ''}-${orgSlug}`],
      { revalidate: 600 },
    )(),
    cache(
      () => getRankedModelFamiliesCount(search, orgSlug),
      [`model-families-ranked-total-${search ?? ''}-${orgSlug}`],
      { revalidate: 600 },
    )(),
    cache(
      () => getRankedModelFamiliesCount(undefined, orgSlug),
      [`model-families-ranked-total--${orgSlug}`],
      { revalidate: 600 },
    )(),
  ]);

  if (total === 0) notFound();

  const orgName = initialData[0]?.orgName ?? orgSlug;

  return (
    <ContainerLayout className="flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <H1 className="mb-2 md:mb-4">{orgName}</H1>
        <ModelFamiliesList
          initialData={initialData}
          total={total}
          searchTotal={searchTotal}
          pageSize={PAGE_SIZE}
          orgSlug={orgSlug}
        />
      </div>
    </ContainerLayout>
  );
}
