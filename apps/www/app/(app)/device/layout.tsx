import type { Metadata } from 'next';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

const title = 'Device';
const description = 'Explore model benchmark stats for a specific device.';
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
    'model size',
    'decode speed',
    'prefill speed',
  ],
  openGraph: {
    title,
    description,
    images,
    url: 'https://whatcani.run/device',
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
    canonical: 'https://whatcani.run/device',
  },
  manifest: '/manifest.json',
};

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex grow flex-col">
      <header className="w-full border-b border-gray-6 bg-black px-4 py-4 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-7xl items-center">
          <h1 className="text-3xl font-medium tracking-tight text-gray-12 md:pb-2 md:text-4xl">
            Device Overview
          </h1>
        </div>
      </header>
      {children}
    </div>
  );
}
