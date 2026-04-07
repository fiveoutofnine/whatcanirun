import Link from 'next/link';

import { ArrowRight, Computer, Layers, Play } from 'lucide-react';

import type { RankedModelFamily } from '@/lib/queries/model-families-ranked';
import { formatValueToPrecision } from '@/lib/utils';

import UserAvatar from '@/components/templates/user-avatar';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelFamilyRowProps = {
  item: RankedModelFamily;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelFamilyRow: React.FC<ModelFamilyRowProps> & {
  Skeleton: React.FC;
} = ({ item }) => {
  return (
    <Link
      href={`/${item.orgSlug}/${item.familySlug}`}
      className="group/model-family-row relative -mx-2 flex w-[calc(100%+1rem)] rounded-xl p-3 transition-colors hover:bg-gray-4 focus-visible:bg-gray-4 md:-mx-4 md:w-[calc(100%+2rem)] md:p-4"
    >
      <div className="pt-0.5">
        <UserAvatar image={item.orgLogoUrl} name={item.orgName} size={40} />
      </div>
      <div className="ml-3 flex min-w-0 grow flex-col">
        <div className="flex w-full items-center justify-between">
          <div className="line-clamp-1 flex items-center gap-1 text-base font-medium leading-6 text-gray-11">
            <span className="hidden font-normal min-[560px]:block">{item.orgName}</span>
            <span className="hidden min-[560px]:block">/</span>
            <span className="line-clamp-1 tracking-tight text-gray-12">{item.familyName}</span>
          </div>
          <div className="w-fit text-nowrap text-sm leading-5 text-gray-11 transition-opacity group-hover/model-family-row:opacity-0 group-focus-visible/model-family-row:opacity-0">
            <span className="tabular-nums">
              {formatValueToPrecision(item.totalTokens, 1, true)}
            </span>{' '}
            tokens
          </div>
        </div>

        <div className="flex flex-wrap gap-x-2.5 gap-y-0">
          {[
            {
              Icon: Layers,
              value: `${item.quantCount.toLocaleString()} quant${item.quantCount > 1 ? 's' : ''}`,
            },
            {
              Icon: Computer,
              value: `${item.deviceCount.toLocaleString()} device${item.deviceCount > 1 ? 's' : ''}`,
            },
            {
              Icon: Play,
              value: `${item.runCount.toLocaleString()} run${item.runCount > 1 ? 's' : ''}`,
            },
          ].map(({ Icon, value }, i) => (
            <div key={i} className="flex min-w-fit items-center gap-1 text-nowrap text-gray-11">
              <Icon className="size-3.5" />
              <div className="text-sm tabular-nums leading-5 text-gray-11">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="top-4.5 gap absolute right-3 flex items-center gap-1 text-sm leading-5 text-gray-11 opacity-0 transition-opacity group-hover/model-family-row:opacity-100 group-focus-visible/model-family-row:opacity-100">
        View
        <ArrowRight className="size-4" />
      </div>
    </Link>
  );
};

const ModelFamilyRowSkeleton: React.FC = () => {
  return (
    <div>
      <hr
        className="my-1 h-px w-full rounded-full border-0 bg-gray-6"
        role="separator"
        aria-hidden
      />
      <div className="flex w-full py-3 md:py-4">
        <div className="pt-0.5">
          <div className="size-10 animate-pulse rounded-full bg-gray-9" />
        </div>
        <div className="ml-3 flex min-w-0 grow flex-col gap-1">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="h-6 w-64 animate-pulse rounded bg-gray-9" />
            <div className="h-5 w-20 animate-pulse rounded bg-gray-9" />
          </div>
          <div className="flex gap-1">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-9" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-9" />
            <div className="h-4 w-14 animate-pulse rounded bg-gray-9" />
          </div>
        </div>
      </div>
    </div>
  );
};

ModelFamilyRow.Skeleton = ModelFamilyRowSkeleton;

export default ModelFamilyRow;
