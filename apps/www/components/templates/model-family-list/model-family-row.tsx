import Link from 'next/link';

import type { RankedModelFamily } from '@/lib/queries/model-families-ranked';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelFamilyRowProps = {
  item: RankedModelFamily;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelFamilyRow: React.FC<ModelFamilyRowProps> = ({ item }) => {
  return (
    <Link
      href={`/${item.orgSlug}/${item.familySlug}`}
      className="flex items-center gap-5 border-b border-gray-6 px-4 py-5 transition-colors hover:bg-gray-2 md:gap-6 md:px-6 md:py-6"
    >
      {item.orgLogoUrl ? (
        <img src={item.orgLogoUrl} alt="" className="h-10 w-10 rounded-full" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-gray-6" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          <span className="text-gray-11">{item.orgName}</span>
          <span className="text-gray-11"> / </span>
          {item.familyName}
        </p>
        <p className="mt-1 text-sm tabular-nums text-gray-11">
          {item.quantCount} quants · {item.deviceCount} devices · {item.runCount.toLocaleString()}{' '}
          runs · {formatTokens(item.totalTokens)}
        </p>
      </div>
    </Link>
  );
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B tokens`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tokens`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K tokens`;
  return `${n} tokens`;
}

export default ModelFamilyRow;
