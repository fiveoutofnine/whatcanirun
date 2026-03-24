'use client';

import { usePathname } from 'next/navigation';
import { Fragment, useState } from 'react';

import type { NavBarInternalProps } from '.';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import clsx from 'clsx';
import { LogOut, Menu } from 'lucide-react';

import { signOut } from '@/lib/auth/client';
import { EXTERNAL_PAGES, NAVBAR_PAGES } from '@/lib/constants/site';
import { UserRole } from '@/lib/db/schema';
import { useMediaQuery } from '@/lib/hooks';

import Logo from '@/components/common/logo';
import UserAvatar from '@/components/templates/user-avatar';
import { Badge, Button, Drawer, IconButton } from '@/components/ui';

const NavBarMobile: React.FC<NavBarInternalProps> = ({ user, loading = false }) => {
  const [open, setOpen] = useState<boolean>(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)'); // `md` breakpoint.

  // Determine which page is selected.
  const pathname = usePathname() ?? '';
  const path = pathname.split('/');
  const selectedPage = `/${!path || path.length < 1 ? '' : path[1]}`;

  return (
    <nav className="pointer-events-auto sticky top-0 z-[30] flex h-14 items-center border-b border-gray-6 bg-white px-4 dark:bg-black md:hidden">
      <Logo />
      <div className="flex-grow" aria-hidden={true} />
      <Drawer.Root open={open && isSmallScreen} onOpenChange={setOpen}>
        <Drawer.Trigger
          className={
            user
              ? 'rounded-full border border-gray-7 transition-colors hover:border-gray-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-9'
              : undefined
          }
          asChild={!user}
        >
          {loading ? (
            <div className="size-8 animate-pulse rounded-full border border-gray-6 bg-gray-5" />
          ) : user ? (
            <UserAvatar className="border-0" image={user.image} name={user.name} size={32} />
          ) : (
            <IconButton variant="ghost">
              <Menu />
            </IconButton>
          )}
        </Drawer.Trigger>
        {/* 448px is the max width value of `max-w-md`. */}
        <Drawer.Content className="max-w-md min-[448px]:border-x [&_[drawer-content]]:p-0">
          <VisuallyHidden.Root>
            <Drawer.Title>Navigation Menu</Drawer.Title>
            <Drawer.Description>Navigate to a page.</Drawer.Description>
          </VisuallyHidden.Root>
          <Drawer.Header
            className={clsx(
              'sticky top-0 z-50 flex w-full overflow-hidden bg-gray-2',
              user
                ? 'h-12 flex-row items-center justify-between pb-2.5 pl-5 pr-3'
                : 'h-10 px-2 pb-2',
              'after:aria-hidden="true" after:pointer-events-none after:absolute after:-bottom-2 after:left-0 after:z-50 after:h-2 after:w-full after:bg-gradient-to-b after:from-gray-2 after:to-transparent after:content-[""]',
            )}
          >
            {user ? (
              <Fragment>
                <div className="flex items-center gap-2.5">
                  <UserAvatar className="border-0" image={user.image} name={user.name} size={36} />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex gap-1.5">
                      <span className="line-clamp-1 overflow-hidden text-ellipsis text-left text-sm font-medium leading-5 text-gray-12">
                        {user.name}
                      </span>
                      {user.role !== UserRole.USER ? (
                        <Badge
                          className="min-w-fit capitalize"
                          size="sm"
                          variant="outline"
                          intent={user.role === UserRole.MODERATOR ? 'success' : 'orange'}
                        >
                          {{ admin: 'Admin', moderator: 'Mod' }[user.role]}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="line-clamp-1 overflow-hidden text-ellipsis text-left text-xs font-normal leading-4 text-gray-11">
                      {user.email}
                    </div>
                  </div>
                </div>
                <IconButton
                  variant="primary"
                  intent="none"
                  onClick={async () =>
                    await signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })
                  }
                >
                  <LogOut />
                </IconButton>
              </Fragment>
            ) : (
              <Button
                className="w-full"
                variant="solid"
                intent="white"
                href={`/login?redirect=${pathname}`}
              >
                Login
              </Button>
            )}
          </Drawer.Header>
          <hr
            className={clsx(
              'border-0.5 sticky z-50 w-full border-gray-6',
              user ? 'top-12' : 'top-10',
            )}
            role="separator"
            aria-hidden
          />
          <div className="hide-scrollbar flex flex-col">
            <div className="flex flex-col gap-1 p-2">
              {NAVBAR_PAGES.map((page) => {
                const selected = selectedPage === page.slug;

                return (
                  <Button
                    key={page.slug}
                    className={clsx(
                      'w-full [&_[button-content]]:grow-[3] [&_[button-content]]:text-left',
                      selected ? 'bg-gray-5 text-gray-12' : '',
                      !page.icon ? 'pl-[2.125rem]' : '',
                    )}
                    variant="ghost"
                    href={page.slug}
                    disabled={selected}
                    leftIcon={page.icon}
                    onClick={() => setOpen(false)}
                  >
                    {page.name}
                  </Button>
                );
              })}
            </div>
            <hr className="border-0.5 w-full border-gray-6" role="separator" aria-hidden />
            <div className="flex flex-col gap-1 p-2">
              {EXTERNAL_PAGES.map((page) => {
                return (
                  <Button
                    key={page.slug}
                    className={clsx(
                      'w-full [&_[button-content]]:grow-[3] [&_[button-content]]:text-left',
                      !page.icon ? 'pl-[2.125rem]' : '',
                    )}
                    variant="ghost"
                    href={page.slug}
                    leftIcon={page.icon}
                    newTab
                  >
                    {page.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Root>
    </nav>
  );
};

export default NavBarMobile;
