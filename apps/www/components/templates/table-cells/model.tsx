import Link from 'next/link';
import { Fragment } from 'react';

import clsx from 'clsx';
import { ArrowUpRight, HardDrive, Layers } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import type { Model, Organization, Run } from '@/lib/db/schema';
import { formatBytes } from '@/lib/utils';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import UserAvatar from '@/components/templates/user-avatar';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelTableCellProps = Pick<Model, 'displayName' | 'quant' | 'source' | 'fileSizeBytes'> &
  Pick<Run, 'runtimeName'> & {
    lab?: Pick<Organization, 'name' | 'logoUrl' | 'websiteUrl' | 'slug'>;
    quantizedBy?: Pick<Organization, 'name' | 'logoUrl' | 'websiteUrl'>;
    labSlug?: string | null;
    familySlug?: string | null;
  };
// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelTableCell: React.FC<ModelTableCellProps> & { Skeleton: React.FC } = ({
  displayName,
  quant,
  source,
  runtimeName,
  fileSizeBytes,
  lab,
  quantizedBy,
  labSlug,
  familySlug,
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

  const familyHref = labSlug && familySlug ? `/${labSlug}/${familySlug}` : null;

  return (
    <div className="flex flex-col items-start">
      <div className="flex h-5 items-center gap-1">
        {familyHref ? (
          <Link className="flex h-5 hover:underline" href={familyHref}>
            <span className="line-clamp-1 leading-5">{displayName}</span>
          </Link>
        ) : source && url ? (
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
        {lab?.logoUrl && quantizedBy?.logoUrl ? (
          <ClickableTooltip
            className="min-w-fit"
            content={
              <span className="whitespace-nowrap text-gray-11">
                Base model by{' '}
                {lab.slug ? (
                  <Link
                    className="inline-flex items-center gap-1 align-[-2px] text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12"
                    href={`/${lab.slug}`}
                  >
                    <UserAvatar image={lab.logoUrl} name={lab.name} size={16} />
                    {lab.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 align-[-2px] text-gray-11">
                    <UserAvatar image={lab.logoUrl} name={lab.name} size={16} />
                    {lab.name}
                  </span>
                )}{' '}
                <br />
                Quantized by{' '}
                {quantizedBy.websiteUrl ? (
                  <a
                    className="inline-flex items-center gap-1 align-[-2px] text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12"
                    href={quantizedBy.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <UserAvatar image={quantizedBy.logoUrl} name={quantizedBy.name} size={16} />
                    <span className="flex">
                      {quantizedBy.name}
                      <ArrowUpRight className="size-3 text-gray-11" />
                    </span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 align-[-2px] text-gray-11">
                    <UserAvatar image={quantizedBy.logoUrl} name={quantizedBy.name} size={16} />
                    {quantizedBy.name}
                  </span>
                )}
              </span>
            }
            triggerProps={{ className: 'rounded-full' }}
          >
            <UserAvatar
              className="border-gray-7 transition-colors hover:border-gray-8"
              image={lab.logoUrl}
              name={lab.name}
              size={18}
              icon={<UserAvatar image={quantizedBy.logoUrl} name={quantizedBy.name} size={12} />}
            />
          </ClickableTooltip>
        ) : lab?.logoUrl && !quantizedBy?.logoUrl ? (
          <ClickableTooltip
            content={
              <span className="text-gray-11">
                Base model by{' '}
                {lab.slug ? (
                  <Link
                    className="inline-flex items-center gap-1 align-[-2px] text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12"
                    href={`/${lab.slug}`}
                  >
                    <UserAvatar image={lab.logoUrl} name={lab.name} size={16} />
                    {lab.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 align-[-2px] text-gray-11">
                    <UserAvatar image={lab.logoUrl} name={lab.name} size={16} />
                    {lab.name}
                  </span>
                )}
              </span>
            }
            triggerProps={{ className: 'rounded-full' }}
          >
            <UserAvatar
              className="border-gray-7 transition-colors hover:border-gray-8"
              image={lab.logoUrl}
              name={lab.name}
              size={18}
            />
          </ClickableTooltip>
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
            icon: <HardDrive />,
            value: fileSizeBytes ? formatBytes(fileSizeBytes) : null,
            content: 'File size',
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
        {source && url ? (
          <a
            className="flex w-fit whitespace-nowrap text-xs leading-4 text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
            <ArrowUpRight className="size-2.5" />
          </a>
        ) : null}
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
          { icon: <HardDrive />, className: 'w-6' },
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
        <div className="flex w-fit text-gray-11">
          Source
          <ArrowUpRight className="size-2.5" />
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

ModelTableCell.Skeleton = ModelTableCellSkeleton;

export default ModelTableCell;
