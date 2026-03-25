import type { Metadata } from 'next';
import { Fragment } from 'react';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'CLI Auth',
  description: 'Authenticate CLI access to your account.',
};

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
