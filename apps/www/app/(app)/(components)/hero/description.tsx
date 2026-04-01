import { unstable_cache as cache } from 'next/cache';

import { count, countDistinct, sum } from 'drizzle-orm';

import { db } from '@/lib/db';
import { runs, trials } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const HeroDescription: React.FC & { Fallback: React.FC } = async () => {
  const [[{ inputTokens, outputTokens }], [{ trialsCount }], [{ uniquePeopleCount }]] = await cache(
    async () =>
      await Promise.all([
        db
          .select({
            inputTokens: sum(runs.promptTokens),
            outputTokens: sum(runs.completionTokens),
          })
          .from(runs),
        db.select({ trialsCount: count() }).from(trials),
        db.select({ uniquePeopleCount: countDistinct(runs.ipHash) }).from(runs),
      ]),
    ['overview-stats'],
    { tags: ['overview-stats'], revalidate: 600 },
  )();

  const totalTokens = Number(inputTokens) + Number(outputTokens);

  return (
    <span className="text-base leading-relaxed text-gray-11 md:text-lg">
      Find the best models and how to run them locally, based on real data from{' '}
      <span className="font-medium tabular-nums text-gray-12">
        {totalTokens.toLocaleString()} token{totalTokens > 1 ? 's' : ''}
      </span>{' '}
      across{' '}
      <span className="font-medium tabular-nums text-gray-12">{trialsCount.toLocaleString()}</span>{' '}
      trial
      {trialsCount > 1 ? 's' : ''} from{' '}
      <span className="font-medium tabular-nums text-gray-12">
        {uniquePeopleCount.toLocaleString()} {uniquePeopleCount === 1 ? 'person' : 'people'}
      </span>
      .
    </span>
  );
};

const HeroDescriptionFallback: React.FC = () => (
  <span className="align-baseline text-base leading-relaxed text-gray-11 md:text-lg">
    Find the best models and how to run them locally, based on real data from{' '}
    <span className="inline-block h-4 min-w-24 animate-pulse rounded bg-gray-9 align-sub md:h-[1.125rem]" />{' '}
    <span className="font-medium text-gray-12">tokens</span> across{' '}
    <span className="inline-block h-4 min-w-12 animate-pulse rounded bg-gray-9 align-sub md:h-[1.125rem]" />{' '}
    <span className="font-medium text-gray-12">trials</span> from{' '}
    <span className="inline-block h-4 min-w-6 animate-pulse rounded bg-gray-9 align-sub md:h-[1.125rem]" />{' '}
    <span className="font-medium text-gray-12">people</span>.
  </span>
);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

HeroDescription.Fallback = HeroDescriptionFallback;

export default HeroDescription;
