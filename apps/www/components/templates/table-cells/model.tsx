import { Fragment } from 'react';

import clsx from 'clsx';
import { ArrowUpRight, Cpu, Layers, Waypoints } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import type { Model, Organization, Run } from '@/lib/db/schema';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import UserAvatar from '@/components/templates/user-avatar';
import { Tooltip } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelTableCellProps = Pick<
  Model,
  'displayName' | 'quant' | 'parameters' | 'architecture' | 'source'
> &
  Pick<Run, 'runtimeName'> & {
    lab?: Pick<Organization, 'name' | 'logoUrl'>;
  };
// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelTableCell: React.FC<ModelTableCellProps> & { Skeleton: React.FC } = ({
  displayName,
  quant,
  parameters,
  architecture,
  source,
  runtimeName,
  lab,
}) => {
  let url = '';
  if (runtimeName === 'mlx_lm') {
    url = `https://huggingface.co/${source}`;
  } else if (runtimeName === 'llama.cpp') {
    const parts = source?.split(':') ?? [];
    if (parts.length > 1) {
      url = `https://huggingface.co/${parts[0]}/blob/main/${parts[1]}`;
    }
  }

  return (
    <div className="flex flex-col items-start">
      <div className="flex h-5 items-center gap-1">
        {source && url ? (
          <a
            className="flex h-5 hover:underline"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="line-clamp-1 leading-5">{displayName}</span>
            <ArrowUpRight className="size-3 text-gray-11" />
          </a>
        ) : (
          <span className="line-clamp-1 leading-5">{displayName}</span>
        )}
        {lab?.logoUrl ? (
          <Tooltip content={lab.name} triggerProps={{ className: 'rounded-full' }} inverted={false}>
            <UserAvatar
              className="border-gray-7 transition-colors hover:border-gray-8"
              image={lab.logoUrl}
              name={lab.name}
              size={18}
            />
          </Tooltip>
        ) : null}
      </div>
      <div className="mt-0 flex h-4 gap-2">
        {[
          {
            icon: <Layers />,
            value: quant,
            content: 'Quantization',
          },
          {
            icon: <Waypoints />,
            value: parameters,
            content: 'Parameters',
          },

          {
            icon: <Cpu />,
            value: architecture,
            content: 'Architecture',
          },
        ].map(({ icon, value, content }, index) => {
          if (!value) return null;

          const Children = (
            <div
              className={clsx(
                'flex w-fit items-center gap-1 whitespace-nowrap text-xs leading-4 text-gray-11',
                content ? 'underline decoration-dotted transition-colors hover:text-gray-12' : '',
              )}
              key={index}
            >
              <span className="flex size-3 items-center justify-center">{icon}</span>
              <span>{value}</span>
            </div>
          );

          if (content) {
            return (
              <ClickableTooltip key={index} content={content}>
                {Children}
              </ClickableTooltip>
            );
          }

          return <Fragment key={index}>{Children}</Fragment>;
        })}
      </div>
    </div>
  );
};

const ModelTableCellSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex h-[1.125rem] items-center gap-1">
        <span className="h-[1.125rem] w-32 animate-pulse rounded bg-gray-9" />
        <div className="size-[1.125rem] animate-pulse rounded-full bg-gray-9" />
      </div>
      <div className="mt-0 flex h-4 gap-2">
        {[
          { icon: <Layers />, className: 'w-7' },
          { icon: <Waypoints />, className: 'w-6' },
          { icon: <Cpu />, className: 'w-12' },
        ].map(({ icon, className }, index) => {
          return (
            <div className="flex w-fit items-center gap-1 text-gray-11" key={index}>
              <span className="flex size-3 items-center justify-center">{icon}</span>
              <span
                className={twMerge(clsx('h-4 w-12 animate-pulse rounded bg-gray-9', className))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

ModelTableCell.Skeleton = ModelTableCellSkeleton;

export default ModelTableCell;
