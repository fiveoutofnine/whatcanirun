import Link from 'next/link';

import { Computer, Layers, Play } from 'lucide-react';

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

const ModelFamilyRow: React.FC<ModelFamilyRowProps> = ({ item }) => {
  return (
    <Link
      href={`/${item.orgSlug}/${item.familySlug}`}
      className="group/model-family-row -mx-2 flex w-[calc(100%+1rem)] rounded-xl px-2 py-2 transition-colors hover:bg-gray-4 md:-mx-4 md:w-[calc(100%+2rem)] md:px-4 md:py-4"
    >
      <div className="pt-0.5">
        <UserAvatar image={item.orgLogoUrl} name={item.orgName} size={40} />
      </div>
      <div className="ml-3 flex min-w-0 grow flex-col">
        <div className="flex w-full items-center justify-between">
          <div className="line-clamp-1 flex items-center gap-1 text-base font-medium leading-6 text-gray-11">
            <span className="font-normal">{item.orgName}</span>
            <span>/</span>
            <span className="line-clamp-1 tracking-tight text-gray-12">{item.familyName}</span>
          </div>
          <div className="w-fit text-nowrap text-base leading-6 text-gray-11">
            <span className="tabular-nums">
              {formatValueToPrecision(item.totalTokens, 1, true)}
            </span>{' '}
            tokens
          </div>
        </div>

        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
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
            <div key={i} className="flex items-center gap-1 text-gray-11">
              <Icon className="size-3.5" />
              <div className="text-sm tabular-nums leading-5 text-gray-11">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default ModelFamilyRow;
