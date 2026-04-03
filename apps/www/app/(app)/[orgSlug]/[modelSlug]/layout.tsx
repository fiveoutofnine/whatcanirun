import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import ModelHeading from './(components)/model-heading';
import { generateBaseMetadata } from './generate-base-metadata';
import { getModelFamily, getModelFamilyChips } from './utils';

import UserAvatar from '@/components/templates/user-avatar';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
  children: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, modelSlug } = await params;
  return generateBaseMetadata({ orgSlug, modelSlug });
}

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default async function Layout({ params, children }: Props) {
  const { orgSlug, modelSlug } = await params;
  const family = await getModelFamily(orgSlug, modelSlug);

  if (!family) notFound();

  const chips = await getModelFamilyChips(family.familyId);

  return (
    <div className="flex grow flex-col">
      <header className="w-full border-b border-gray-6 bg-black px-4 py-4 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-5xl items-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium text-gray-11 md:text-3xl">
              <Link
                href={`/${family.orgSlug}`}
                className="font-normal underline decoration-dotted transition-colors hover:text-gray-12"
              >
                {family.orgWebsiteUrl ? (
                  <Fragment>
                    <span className="mr-2 inline-block align-middle md:hidden">
                      <UserAvatar image={family.orgLogoUrl} name={family.orgName} size={24} />
                    </span>
                    <span className="mr-2 hidden align-middle md:inline-block">
                      <UserAvatar image={family.orgLogoUrl} name={family.orgName} size={30} />
                    </span>
                  </Fragment>
                ) : null}
                {family.orgName}
              </Link>
              <span className="font-medium tracking-[-0.05em]"> / </span>
              <ModelHeading familyName={family.familyName} chips={chips} />
            </h1>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
