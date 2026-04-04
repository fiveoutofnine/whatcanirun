import { unstable_cache as cache } from 'next/cache';

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

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const search = q?.trim() || undefined;

  const [initialData, searchTotal, total] = await Promise.all([
    cache(
      () => getRankedModelFamilies(0, PAGE_SIZE, search),
      [`model-families-ranked-0-30-${search ?? ''}`],
      { revalidate: 600 },
    )(),
    cache(
      () => getRankedModelFamiliesCount(search),
      [`model-families-ranked-total-${search ?? ''}`],
      { revalidate: 600 },
    )(),
    cache(() => getRankedModelFamiliesCount(), [`model-families-ranked-total`], {
      revalidate: 600,
    })(),
  ]);

  return (
    <ContainerLayout className="flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <H1 className="mb-2 md:mb-4">Models</H1>
        <ModelFamiliesList
          initialData={initialData}
          total={total}
          searchTotal={searchTotal}
          pageSize={PAGE_SIZE}
        />
      </div>
    </ContainerLayout>
  );
}
