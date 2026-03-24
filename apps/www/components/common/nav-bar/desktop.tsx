'use client';

import { usePathname } from 'next/navigation';

import type { NavBarInternalProps } from '.';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';

import { EXTERNAL_PAGES, NAVBAR_PAGES } from '@/lib/constants/site';

import Logo from '@/components/common/logo';
import UserDropdown from '@/components/templates/user-dropdown';
import { Button } from '@/components/ui';

const NavBarDesktop: React.FC<NavBarInternalProps> = ({ user, loading = false }) => {
  // Determine which page is selected.
  const pathname = usePathname() ?? '';
  const path = pathname.split('/');
  const selectedPage = `/${!path || path.length < 1 ? '' : path[1]}`;

  return (
    <nav className="pointer-events-auto sticky top-0 z-[30] hidden h-16 items-center border-b border-gray-6 bg-white px-6 dark:bg-black md:flex">
      <div className="mx-auto flex w-full max-w-[95rem] items-center">
        <Logo />
        {NAVBAR_PAGES.map((page, index) => {
          const selected = selectedPage === page.slug;

          return (
            <Button
              key={page.slug}
              className={clsx(
                index > 0 ? 'ml-2' : 'ml-4',
                selected ? 'cursor-default bg-gray-5 text-gray-12' : '',
              )}
              variant="ghost"
              href={page.slug}
              disabled={selected}
            >
              {page.name}
            </Button>
          );
        })}
        {EXTERNAL_PAGES.map((page) => {
          return (
            <Button
              key={page.slug}
              className="ml-2"
              variant="ghost"
              href={page.slug}
              rightIcon={<ArrowUpRight />}
              newTab
            >
              {page.name}
            </Button>
          );
        })}
        <div className="flex-grow" aria-hidden={true} />
        {loading ? (
          <div className="size-8 animate-pulse rounded-full border border-gray-6 bg-gray-9" />
        ) : user ? (
          <UserDropdown user={user} />
        ) : (
          <Button variant="solid" intent="white" href={`/login?redirect=${pathname}`}>
            Login
          </Button>
        )}
      </div>
    </nav>
  );
};

export default NavBarDesktop;
