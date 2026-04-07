import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import { generateBaseMetadata } from './generate-base-metadata';
import TabsNav from './tabs';
import { getModelFamily } from './utils';
import { Calendar, Scale, Waypoints } from 'lucide-react';

import ClickableTooltip from '@/components/templates/clickable-tooltip';
import RelativeDate from '@/components/templates/relative-date';
import UserAvatar from '@/components/templates/user-avatar';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug, modelSlug } = await params;

  return generateBaseMetadata({ orgSlug, modelSlug });
}

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
  children: React.ReactNode;
}) {
  const { orgSlug, modelSlug } = await params;
  const family = await getModelFamily(orgSlug, modelSlug);
  if (!family) notFound();

  return (
    <div className="flex grow flex-col">
      <header className="w-full border-b border-gray-6 bg-black px-4 py-4 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-5xl items-center">
          <div className="flex flex-col gap-1 md:gap-2">
            <h1 className="flex items-center gap-1.5 text-2xl font-medium text-gray-11 md:text-3xl">
              <Link
                href={`/${family.orgSlug}`}
                className="flex items-center gap-2 font-normal underline decoration-dotted transition-colors hover:text-gray-12"
              >
                {family.orgWebsiteUrl ? (
                  <Fragment>
                    <span className="md:hidden">
                      <UserAvatar image={family.orgLogoUrl} name={family.orgName} size={24} />
                    </span>
                    <span className="hidden md:block">
                      <UserAvatar image={family.orgLogoUrl} name={family.orgName} size={30} />
                    </span>
                  </Fragment>
                ) : null}
                <span>{family.orgName}</span>
              </Link>
              <span>/</span>
              <span className="line-clamp-1 tracking-tight text-gray-12">{family.familyName}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-0 md:gap-x-3 md:pl-[2.375rem]">
              {[
                {
                  icon: <Waypoints />,
                  text: formatParameters(family.parameters),
                  label: 'Parameters',
                },
                {
                  icon: <Calendar />,
                  text: family.releaseDate ? (
                    <RelativeDate date={new Date(family.releaseDate)} type="absolute" />
                  ) : null,
                },
                {
                  icon: <Scale />,
                  text: family.license,
                  label: 'License',
                },
              ].map(({ icon, text, label }, i) =>
                text ? (
                  label ? (
                    <ClickableTooltip key={i} content={label}>
                      <div className="flex min-w-fit items-center gap-1 text-nowrap text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12 md:gap-1.5">
                        <span className="flex size-3.5 items-center justify-center text-gray-11 md:size-4">
                          {icon}
                        </span>
                        <span className="text-sm md:text-base">{text}</span>
                      </div>
                    </ClickableTooltip>
                  ) : (
                    <div
                      key={i}
                      className="flex min-w-fit items-center gap-1 text-nowrap text-gray-11 md:gap-1.5"
                    >
                      <span className="flex size-3.5 items-center justify-center md:size-4">
                        {icon}
                      </span>
                      <span className="text-sm md:text-base">{text}</span>
                    </div>
                  )
                ) : null,
              )}
            </div>
          </div>
        </div>
      </header>
      <TabsNav orgSlug={orgSlug} modelSlug={modelSlug}>
        {children}
      </TabsNav>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatParameters(params: string | null): string | null {
  if (!params) return null;

  const match = params.match(/^([\d.]+\s*[KMBT]?)[-–]A([\d.]+\s*[KMBT]?)$/i);
  if (!match) return params;

  return `${match[1]} (${match[2]} active)`;
}
