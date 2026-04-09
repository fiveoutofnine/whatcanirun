'use client';

import { forwardRef } from 'react';

import {
  tabsContentStyles,
  tabsListStyles,
  tabsTriggerContentStyles,
  tabsTriggerIconStyles,
  tabsTriggerLinkStyles,
  tabsTriggerStatStyles,
  tabsTriggerStyles,
} from './styles';
import type {
  TabsComposition,
  TabsContentProps,
  TabsListProps,
  TabsRootProps,
  TabsTriggerProps,
} from './types';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

import { isExternalHref } from '@/lib/preserved-device-navigation';

import PreservedDeviceLink from '@/components/common/preserved-device-link';
import { Badge } from '@/components/ui';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const TabsContent = forwardRef(
  ({ className, ...rest }: TabsContentProps, ref: React.ForwardedRef<HTMLDivElement>) => (
    <TabsPrimitive.Content
      className={twMerge(clsx(tabsContentStyles, className))}
      {...rest}
      ref={ref}
    />
  ),
);

const TabsList = forwardRef(
  ({ className, ...rest }: TabsListProps, ref: React.ForwardedRef<HTMLDivElement>) => (
    <TabsPrimitive.List className={twMerge(clsx(tabsListStyles, className))} {...rest} ref={ref} />
  ),
);

const TabsRoot: React.FC<TabsRootProps> = TabsPrimitive.Root;

const TabsTrigger = forwardRef(
  (props: TabsTriggerProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    // Return early if `asChild` is used, so features/props native to this
    // component do not get passed down to the `TabsPrimitive.Trigger` component.
    if (props.asChild) return <TabsPrimitive.Trigger {...props} />;

    // Destructure props. `asChild` is false-y here, but we destructure it out
    // because we don't want to pass it in if the trigger has an `href` prop.
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const { className, icon, stat, href, newTab, children, asChild, type, ...rest } = props;

    if (href) {
      const linkProps = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

      return (
        <TabsPrimitive.Trigger
          className={twMerge(clsx(tabsTriggerStyles, className))}
          ref={ref}
          type={undefined}
          asChild
          {...rest}
        >
          {isExternalHref(href) ? (
            <a
              className={clsx(tabsTriggerLinkStyles, rest.disabled ? 'pointer-events-none' : '')}
              href={href}
              {...linkProps}
            >
              <span className={clsx(tabsTriggerContentStyles)}>
                {icon ? <span className={clsx(tabsTriggerIconStyles)}>{icon}</span> : null}
                <span>{children}</span>
                {stat !== undefined ? (
                  <Badge
                    className={clsx(tabsTriggerStatStyles)}
                    size="sm"
                    variant="secondary"
                    intent="none"
                    type="number"
                  >
                    {stat}
                  </Badge>
                ) : null}
              </span>
            </a>
          ) : (
            <PreservedDeviceLink
              className={clsx(tabsTriggerLinkStyles, rest.disabled ? 'pointer-events-none' : '')}
              href={href}
              {...linkProps}
            >
              <span className={clsx(tabsTriggerContentStyles)}>
                {icon ? <span className={clsx(tabsTriggerIconStyles)}>{icon}</span> : null}
                <span>{children}</span>
                {stat !== undefined ? (
                  <Badge
                    className={clsx(tabsTriggerStatStyles)}
                    size="sm"
                    variant="secondary"
                    intent="none"
                    type="number"
                  >
                    {stat}
                  </Badge>
                ) : null}
              </span>
            </PreservedDeviceLink>
          )}
        </TabsPrimitive.Trigger>
      );
    }

    return (
      <TabsPrimitive.Trigger
        className={twMerge(clsx(tabsTriggerStyles, className))}
        ref={ref}
        type={type}
        {...rest}
      >
        <span className={clsx(tabsTriggerContentStyles)}>
          {icon ? <span className={clsx(tabsTriggerIconStyles)}>{icon}</span> : null}
          <span className="group-data-[orientation=vertical]:mr-auto">{children}</span>
          {stat !== undefined ? (
            <Badge
              className={clsx(tabsTriggerStatStyles)}
              size="sm"
              variant="secondary"
              intent="none"
              type="number"
            >
              {stat}
            </Badge>
          ) : null}
        </span>
      </TabsPrimitive.Trigger>
    );
  },
);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

TabsContent.displayName = TabsPrimitive.Content.displayName;
TabsList.displayName = TabsPrimitive.List.displayName;
TabsRoot.displayName = TabsPrimitive.Root.displayName;
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const Tabs: TabsComposition = {
  Content: TabsContent,
  List: TabsList,
  Root: TabsRoot,
  Trigger: TabsTrigger,
};

export default Tabs;
