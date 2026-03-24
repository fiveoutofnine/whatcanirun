import { Suspense } from 'react';

import Hero from './(components)/hero';
import ModelsDataTableServer from './(components)/models-data-table/server';

import ContainerLayout from '@/components/layouts/container';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagination?: string; sorting?: string }>;
}) {
  return (
    <ContainerLayout className="flex flex-col">
      <Hero />
      <Suspense fallback={null}>
        <ModelsDataTableServer searchParams={searchParams} />
      </Suspense>
    </ContainerLayout>
  );
}
