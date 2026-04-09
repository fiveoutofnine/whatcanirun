'use client';

import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

type Listener = () => void;

const listeners = new Set<Listener>();
const MODEL_ROUTE_BLOCKLIST = new Set(['api', 'cli-auth', 'docs', 'legal', 'login', 'models', 'runs']);
const TARGET_BLOCKLIST = ['/api', '/cli-auth', '/login'];

let navigationDevice: string | null = null;

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => navigationDevice;

export const setPreservedNavigationDevice = (device: string | null) => {
  if (navigationDevice === device) return;
  navigationDevice = device;
  listeners.forEach((listener) => listener());
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export const isExternalHref = (href: string) =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');

const shouldPreserveDeviceForPath = (pathname: string | null) => {
  if (!pathname) return false;
  if (pathname === '/') return true;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return false;

  return !MODEL_ROUTE_BLOCKLIST.has(segments[0] ?? '');
};

const shouldPreserveDeviceForTarget = (pathname: string) =>
  !TARGET_BLOCKLIST.some((blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`));

const withDeviceSearchParam = (href: string, device: string) => {
  if (isExternalHref(href) || href.startsWith('#')) return href;

  const url = new URL(href, 'http://whatcani.run');
  if (!shouldPreserveDeviceForTarget(url.pathname) || url.searchParams.has('device')) return href;

  url.searchParams.set('device', device);
  return `${url.pathname}${url.search}${url.hash}`;
};

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

export const usePreservedDeviceHref = (href: string) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storedDevice = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const device = searchParams.get('device') ?? storedDevice;

  return useMemo(() => {
    if (!shouldPreserveDeviceForPath(pathname) || !device) return href;
    return withDeviceSearchParam(href, device);
  }, [device, href, pathname]);
};

export const usePreservedNavigationDevice = (device: string | null) => {
  useLayoutEffect(() => {
    setPreservedNavigationDevice(device);

    return () => {
      if (navigationDevice === device) setPreservedNavigationDevice(null);
    };
  }, [device]);
};
