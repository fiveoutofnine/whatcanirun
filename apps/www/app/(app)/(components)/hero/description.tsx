import { cacheLife } from 'next/cache';

import { count, countDistinct, sum } from 'drizzle-orm';

import { db } from '@/lib/db';
import { runs, trials } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const HeroDescription: React.FC & { Fallback: React.FC } = async () => {
  'use cache';
  cacheLife({ stale: 300, revalidate: 300 });

  const [[{ inputTokens, outputTokens }], [{ trialsCount }], [{ uniqueUsersCount }]] =
    await Promise.all([
      db
        .select({ inputTokens: sum(runs.promptTokens), outputTokens: sum(runs.completionTokens) })
        .from(runs),
      db.select({ trialsCount: count() }).from(trials),
      db.select({ uniqueUsersCount: countDistinct(runs.userId) }).from(runs),
    ]);

  const totalTokens = Number(inputTokens) + Number(outputTokens);

  return (
    <span className="text-base leading-relaxed text-gray-11 md:text-lg">
      Find the best models and how to run them locally, based on real data from{' '}
      {totalTokens.toLocaleString()} tokens across {trialsCount.toLocaleString()} trials from from{' '}
      {uniqueUsersCount.toLocaleString()} people.
    </span>
  );
};

const HeroDescriptionFallback: React.FC = () => (
  <span className="align-baseline text-base leading-relaxed text-gray-11 md:text-lg">
    Find the best models and how to run them locally, based on real data from{' '}
    <span className="inline-block h-4 min-w-24 animate-pulse rounded bg-gray-9 align-sub md:h-[1.125rem]" />{' '}
    tokens across{' '}
    <span className="inline-block h-4 min-w-12 animate-pulse rounded bg-gray-9 align-sub md:h-[1.125rem]" />{' '}
    trials from{' '}
    <span className="inline-block h-4 min-w-6 animate-pulse rounded bg-gray-9 align-sub md:h-[1.125rem]" />{' '}
    people.
  </span>
);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

HeroDescription.Fallback = HeroDescriptionFallback;

export default HeroDescription;
