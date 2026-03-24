import { cacheLife } from 'next/cache';

import Hero from './(components)/hero';
import { desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { view__model_stats_by_device } from '@/lib/db/schema';

import ContainerLayout from '@/components/layouts/container';

export default async function Page() {
  'use cache';
  cacheLife({ stale: 300, revalidate: 300 });

  const data = await db
    .select()
    .from(view__model_stats_by_device)
    .orderBy(desc(view__model_stats_by_device.avgDecodeTps))
    .limit(50);

  return (
    <ContainerLayout className="flex flex-col space-y-4">
      <Hero />
      <pre className="w-full">{JSON.stringify(data, null, 2)}</pre>
    </ContainerLayout>
  );
}
