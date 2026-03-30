import type { Metadata } from 'next';
import { Fragment } from 'react';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

const title = 'Runs';
const description = 'View all benchmark runs across all devices and models.';
const images = [
  {
    url: 'https://whatcani.run/images/og/home.png',
    alt: 'whatcani.run OpenGraph image',
    width: 1200,
    height: 630,
  },
];

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'whatcani.run',
    'local ai',
    'llms',
    'ai',
    'benchmarking',
    'ai benchmarking',
    'apple silicon',
  ],
  openGraph: {
    title,
    description,
    images,
    url: 'https://whatcani.run',
    siteName: 'whatcani.run',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    title,
    description,
    images,
    card: 'summary_large_image',
    creator: '@fiveoutofnine',
    creatorId: '1269561030272643076',
  },
  alternates: {
    canonical: 'https://whatcani.run/runs',
  },
  manifest: '/manifest.json',
};

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
