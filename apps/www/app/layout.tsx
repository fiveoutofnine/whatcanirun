import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import LocalFont from 'next/font/local';

import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import clsx from 'clsx';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { Toaster } from '@/components/ui';

// -----------------------------------------------------------------------------
// Fonts
// -----------------------------------------------------------------------------

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// We load Fira Code locally because Google Font's `@font-face` definition
// leaves out some important glyphs for a mono font (such as [box drawing
// characters](http://unicode.org/charts/PDF/U2500.pdf)).
const firaCode = LocalFont({
  src: '../public/static/fonts/FiraCode-VariableFont_wght.ttf',
  variable: '--font-fira-code',
});
const serpentine = LocalFont({
  src: '../public/static/fonts/Serpentine-Sans-ICG-Oblique.woff2',
  variable: '--font-serpentine',
});

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

const title = 'whatcani.run';
const description = 'Find the best models and how to run them locally.';

export const metadata: Metadata = {
  title: {
    template: '%s | whatcani.run',
    default: title,
  },
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
    canonical: 'https://whatcani.run',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#000',
  width: 'device-width',
  initialScale: 1,
};

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={clsx(inter.variable, firaCode.variable, serpentine.variable, 'dark')}
      style={{ background: '#000' }}
      lang="en"
    >
      <body className={clsx(inter.className, 'relative flex min-h-screen w-full flex-col')}>
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
