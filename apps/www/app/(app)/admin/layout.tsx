import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Fragment } from 'react';

import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = (await auth.api.getSession({ headers: await headers() }))?.user;
  if (!user || user.role !== UserRole.ADMIN) return redirect('/');

  return <Fragment>{children}</Fragment>;
}
