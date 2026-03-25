import { Suspense } from 'react';

import Hero from './(components)/hero';
import ModelsDataTableServer from './(components)/models-data-table/server';
import ModelsDataTableSkeleton from './(components)/models-data-table/skeleton';

import ContainerLayout from '@/components/layouts/container';
import { H2 } from '@/components/templates/mdx';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagination?: string; sorting?: string }>;
}) {
  return (
    <ContainerLayout className="flex flex-col">
      <Hero />
      <H2 className="mb-2">Models</H2>
      <Suspense fallback={<ModelsDataTableSkeleton rowCount={25} />}>
        <ModelsDataTableServer searchParams={searchParams} />
      </Suspense>
    </ContainerLayout>
  );
}
