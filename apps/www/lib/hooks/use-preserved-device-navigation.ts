'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import {
  getPreservedNavigationDevice,
  setPreservedNavigationDevice,
  shouldPreserveDeviceForPath,
  subscribePreservedNavigationDevice,
  withDeviceSearchParam,
} from '@/lib/preserved-device-navigation';

export const usePreservedDeviceHref = (href: string, preserveDevice = true) => {
  const pathname = usePathname();
  const device = useSyncExternalStore(
    subscribePreservedNavigationDevice,
    getPreservedNavigationDevice,
    () => null,
  );

  return useMemo(() => {
    if (!preserveDevice || !shouldPreserveDeviceForPath(pathname) || !device) return href;
    return withDeviceSearchParam(href, device);
  }, [device, href, pathname, preserveDevice]);
};

export const usePreservedNavigationDevice = (device: string | null) => {
  useLayoutEffect(() => {
    setPreservedNavigationDevice(device);

    return () => {
      if (getPreservedNavigationDevice() === device) setPreservedNavigationDevice(null);
    };
  }, [device]);
};
