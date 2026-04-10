import type { Metadata } from 'next';
import { unstable_cache as cache } from 'next/cache';
import { Fragment } from 'react';

import { db } from '@/lib/db';
import { parseManufacturer } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> => {
  const { id } = await params;

  const run = await cache(
    async () =>
      db.query.runs.findFirst({
        columns: {
          modelId: true,
          deviceId: true,
        },
        with: {
          model: {
            columns: {
              displayName: true,
              quant: true,
            },
            with: {
              info: {
                columns: {
                  name: true,
                  quant: true,
                },
              },
            },
          },
          device: {
            columns: {
              gpu: true,
              cpu: true,
              cpuCores: true,
            },
          },
        },
        where: (run, { eq }) => eq(run.id, id),
      }),
    [`run-${id}`],
    { revalidate: 600 },
  )();

  if (!run) return {};

  const modelName = run.model?.info?.name ?? run.model.displayName;
  const quant = run.model?.info?.quant ?? run.model.quant;
  const { manufacturer, displayName } = parseManufacturer(run.device.gpu);
  const isApple = manufacturer === 'apple';
  const article = isApple || 'aeiou'.includes(displayName.charAt(0).toLowerCase()) ? 'an' : 'a';

  const title = `Run Details`;
  const description =
    `View details for a benchmark run of ${modelName} ${quant ? `(${quant} quant) ` : ''}` +
    displayName
      ? `on ${article} ${displayName}.`
      : '.';
  const url = `https://whatcani.run/run/${id}`;
  const images = [
    {
      url: 'https://whatcani.run/images/og/home.png',
      alt: 'whatcani.run OpenGraph image',
      width: 1200,
      height: 630,
    },
  ];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'whatcani.run',
      locale: 'en_US',
      type: 'website',
      images,
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
      creator: '@fiveoutofnine',
      creatorId: '1269561030272643076',
      images,
    },
    alternates: {
      canonical: url,
    },
    manifest: '/manifest.json',
  };
};

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
