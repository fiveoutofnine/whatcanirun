import type { Metadata } from 'next';

import ContainerLayout from '@/components/layouts/container';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  robots: {
    index: false,
    follow: false,
  },
};

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function Page() {
  return <ContainerLayout className="flex flex-col space-y-4">Admin Dashboard</ContainerLayout>;
}
