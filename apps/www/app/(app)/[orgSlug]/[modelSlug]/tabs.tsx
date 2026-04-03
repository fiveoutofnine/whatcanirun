'use client';

import { usePathname } from 'next/navigation';

import clsx from 'clsx';

import { Tabs } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type TabsNavProps = {
  orgSlug: string;
  modelSlug: string;
  children?: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const TabsNav: React.FC<TabsNavProps> = ({ orgSlug, modelSlug, children }) => {
  const pathname = usePathname();
  const rootPath = `/${orgSlug}/${modelSlug}`;

  return (
    <Tabs.Root
      className="flex h-full flex-grow flex-col"
      defaultValue={pathname}
      value={pathname}
      activationMode="manual"
    >
      <div className="sticky top-14 z-[30] w-full border-b border-gray-6 bg-black px-0 md:top-16 md:px-6">
        <Tabs.List
          className={clsx(
            'mx-auto w-full max-w-5xl overflow-y-hidden px-4 data-[orientation=horizontal]:border-b-0 md:px-0',
            'before:aria-hidden="true" before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:z-10 before:h-full before:w-4 before:bg-gradient-to-r before:from-black before:to-transparent before:content-[""] before:md:hidden',
            'after:aria-hidden="true" after:pointer-events-none after:absolute after:bottom-0 after:right-0 after:z-10 after:h-full after:w-4 after:bg-gradient-to-l after:from-black after:to-transparent after:content-[""] after:md:hidden',
          )}
        >
          {[
            { name: 'Overview', href: `${rootPath}`, hidden: false },
            {
              name: 'Runs',
              href: `${rootPath}/runs`,
              hidden: false,
            },
          ].map(({ name, href, hidden }) =>
            !hidden ? (
              <Tabs.Trigger
                key={href}
                className="data-[state=active]:before:bottom-0"
                id={`trigger-${href}`}
                value={href}
                href={href}
                aria-controls={`content-${href}`}
              >
                {name}
              </Tabs.Trigger>
            ) : null,
          )}
        </Tabs.List>
      </div>
      {children}
    </Tabs.Root>
  );
};

export default TabsNav;
