import { Suspense } from 'react';

import NavBar from '@/components/common/nav-bar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex grow flex-col">
      <Suspense fallback={<NavBar.Fallback />}>
        <NavBar />
      </Suspense>
      {children}
    </main>
  );
}
