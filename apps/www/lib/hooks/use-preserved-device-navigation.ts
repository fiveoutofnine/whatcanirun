'use client';

import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import {
  getPreservedNavigationDevice,
  setPreservedNavigationDevice,
  shouldPreserveDeviceForPath,
  subscribePreservedNavigationDevice,
  withDeviceSearchParam,
} from '@/lib/preserved-device-navigation';

export const usePreservedDeviceHref = (href: string) => {
  const pathname = usePathname();
  const device = useSyncExternalStore(
    subscribePreservedNavigationDevice,
    getPreservedNavigationDevice,
    () => null,
  );

  return useMemo(() => {
    if (!shouldPreserveDeviceForPath(pathname) || !device) return href;
    return withDeviceSearchParam(href, device);
  }, [device, href, pathname]);
};

export const usePreservedNavigationDevice = (device: string | null) => {
  useLayoutEffect(() => {
    setPreservedNavigationDevice(device);

    return () => {
      if (getPreservedNavigationDevice() === device) setPreservedNavigationDevice(null);
    };
  }, [device]);
};
