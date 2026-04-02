import type { Metadata } from 'next';
import { Suspense } from 'react';

import NavBar from '@/components/common/nav-bar';
import ErrorLayout from '@/components/layouts/error';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: '404',
  description: 'Page not found.',
};

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function NotFound() {
  return (
    <main className="relative flex grow flex-col">
      <Suspense fallback={<NavBar.Fallback />}>
        <NavBar />
      </Suspense>
      <ErrorLayout statusCode={404} />
    </main>
  );
}
