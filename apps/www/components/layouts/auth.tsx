import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

import Logo from '@/components/common/logo';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type AuthLayoutProps = {
  banner?: React.ReactNode;
  children?: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const AuthLayout: React.FC<AuthLayoutProps> = ({ banner, children }) => {
  return (
    <main className="flex min-h-screen w-full">
      <section className="hide-scrollbar flex h-screen min-h-screen w-full flex-col overflow-y-scroll bg-gray-1">
        <header className="sticky top-0 z-[30] flex h-16 min-h-[4rem] w-full items-center bg-gray-1/50 px-6 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center">
            <Logo />
          </div>
        </header>
        {banner ? <div className="sticky top-16 w-full">{banner}</div> : null}
        <div className="flex grow-[3] items-center justify-center px-4 py-4 sm:py-12">
          {children}
        </div>
        <footer className="sticky bottom-0 flex w-full justify-center bg-gray-1/50 px-4 py-6 backdrop-blur">
          <span className="text-center text-xs font-normal leading-4 text-gray-11">
            By continuing, you agree to our{' '}
            <Link
              className="inline rounded-sm underline transition-colors hover:text-gray-12"
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Use
              <ArrowUpRight className="mb-2 inline h-2 w-2" />
            </Link>{' '}
            and{' '}
            <Link
              className="inline rounded-sm underline transition-colors hover:text-gray-12"
              href="/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Statement
              <ArrowUpRight className="mb-2 inline h-2 w-2" />
            </Link>
            .
          </span>
        </footer>
      </section>
    </main>
  );
};

export default AuthLayout;
