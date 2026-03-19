import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Fragment } from 'react';

import { auth } from '@/lib/auth';

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

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = (await auth.api.getSession({ headers: await headers() }))?.user;
  if (user) return redirect('/');

  return <Fragment>{children}</Fragment>;
}
