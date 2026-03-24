import { cacheLife } from 'next/cache';

import Hero from './(components)/hero';

import { db } from '@/lib/db';

import ContainerLayout from '@/components/layouts/container';

export default async function Page() {
  'use cache';
  cacheLife({ stale: 300, revalidate: 300 });

  const data = await db.query.models.findMany({});

  return (
    <ContainerLayout className="flex flex-col space-y-4">
      <Hero />
      <pre className="w-full">{JSON.stringify(data, null, 2)}</pre>
    </ContainerLayout>
  );
}
