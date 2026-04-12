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
          decodeTpsMean: true,
          prefillTpsMean: true,
        },
        with: {
          model: {
            columns: {
              displayName: true,
              quant: true,
              format: true,
            },
            with: {
              info: {
                columns: {
                  name: true,
                  quant: true,
                },
                with: {
                  lab: {
                    columns: {
                      logoUrl: true,
                    },
                  },
                },
              },
            },
          },
          device: {
            columns: {
              gpu: true,
              gpuCount: true,
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
  const format = run.model?.format;
  const primaryDeviceName = run.device.gpuCount > 0 ? run.device.gpu : run.device.cpu;
  const { manufacturer, displayName } = parseManufacturer(primaryDeviceName);
  const deviceName = displayName || primaryDeviceName;
  const isApple = manufacturer === 'apple';
  const article = isApple || 'aeiou'.includes(deviceName.charAt(0).toLowerCase()) ? 'an' : 'a';

  const modelLabLogoUrl = run.model?.info?.lab?.logoUrl;
  const ogLogoBase = 'https://daimon-assets.fiveoutofnine.com/org_logos';
  const toOgLogoUrl = (url: string) => {
    const slug = url
      .split('/')
      .pop()
      ?.replace(/\.\w+$/, '');
    return slug ? `${ogLogoBase}/${slug}.jpg` : undefined;
  };

  const ogParams = new URLSearchParams();
  ogParams.set('model', modelName);
  if (quant) ogParams.set('modelQuant', quant + (format ? ` (${format})` : ''));
  const ogModelLabLogoUrl = modelLabLogoUrl ? toOgLogoUrl(modelLabLogoUrl) : undefined;
  if (ogModelLabLogoUrl) ogParams.set('modelLabLogoUrl', ogModelLabLogoUrl);
  if (manufacturer) ogParams.set('deviceManufacturerLogoUrl', `${ogLogoBase}/${manufacturer}.jpg`);
  if (run.decodeTpsMean) ogParams.set('decode', String(run.decodeTpsMean));
  if (run.prefillTpsMean) ogParams.set('prefill', String(run.prefillTpsMean));
  ogParams.set('device', deviceName);

  const title =
    modelName && deviceName ? `Run Details for ${modelName} on ${deviceName}` : 'Run Details';
  const description =
    `View details for a benchmark run of ${modelName} ${quant ? ` (${quant} quant) ` : ''}` +
    (deviceName ? `on ${article} ${deviceName}.` : '.');
  const url = `https://whatcani.run/run/${id}`;
  const images = [
    {
      url: `https://whatcani.run/api/og/run?${ogParams.toString()}`,
      alt: `${modelName} benchmark results on ${deviceName}`,
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
