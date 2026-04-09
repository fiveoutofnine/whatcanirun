'use client';

import Link, { type LinkProps } from 'next/link';
import { forwardRef } from 'react';

import { usePreservedDeviceHref } from '@/lib/preserved-device-navigation';

type PreservedDeviceLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  Omit<LinkProps, 'href'> & {
    href: string;
  };

const PreservedDeviceLink = forwardRef<HTMLAnchorElement, PreservedDeviceLinkProps>(
  ({ href, ...rest }, ref) => {
    const preservedHref = usePreservedDeviceHref(href);

    return <Link ref={ref} href={preservedHref} {...rest} />;
  },
);

PreservedDeviceLink.displayName = 'PreservedDeviceLink';

export default PreservedDeviceLink;
