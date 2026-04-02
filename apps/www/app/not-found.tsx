import type { Metadata } from 'next';

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
      <ErrorLayout statusCode={404} />
    </main>
  );
}
