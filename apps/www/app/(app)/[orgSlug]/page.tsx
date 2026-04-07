import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import {
  getRankedModelFamilies,
  getRankedModelFamiliesCount,
  MODEL_FAMILY_SORT_OPTIONS,
  type ModelFamilySort,
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
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { orgSlug } = await params;
  const { q, sort: sortParam } = await searchParams;
  const search = q?.trim() || undefined;
  const sort: ModelFamilySort =
    sortParam && MODEL_FAMILY_SORT_OPTIONS.includes(sortParam as ModelFamilySort)
      ? (sortParam as ModelFamilySort)
      : 'newest';

  const [initialData, searchTotal, total] = await Promise.all([
    cache(
      () => getRankedModelFamilies(0, PAGE_SIZE, search, orgSlug, sort),
      [`model-families-ranked-0-${PAGE_SIZE}-${search ?? ''}-${orgSlug}-${sort}`],
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
        <H1 className="mb-2 md:mb-4" link={false}>
          {orgName}
        </H1>
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
