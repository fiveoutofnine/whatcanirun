import type { Metadata } from 'next';

import 'katex/dist/katex.min.css';

import { Article } from '@/components/templates/mdx';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

const title = 'Docs';
const description = 'Find the best models and how to run them locally.';

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
    images: [],
    url: 'https://whatcani.run',
    siteName: 'whatcani.run',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    title,
    description,
    images: [],
    card: 'summary_large_image',
    creator: '@fiveoutofnine',
    creatorId: '1269561030272643076',
  },
  alternates: {
    canonical: 'https://whatcani.run/docs',
  },
  manifest: '/manifest.json',
};

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex w-full max-w-3xl grow flex-col px-4 py-4 md:px-8 md:py-8 lg:px-12 lg:py-16">
      <Article fullBleedCodeBlocks>{children}</Article>
    </div>
  );
}
