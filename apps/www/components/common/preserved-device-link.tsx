'use client';

import Link, { type LinkProps } from 'next/link';
import { forwardRef } from 'react';

import { usePreservedDeviceHref } from '@/lib/hooks';

type PreservedDeviceLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  Omit<LinkProps, 'href'> & {
    href: string;
    preserveDevice?: boolean;
  };

const PreservedDeviceLink = forwardRef<HTMLAnchorElement, PreservedDeviceLinkProps>(
  ({ href, preserveDevice = true, ...rest }, ref) => {
    const preservedHref = usePreservedDeviceHref(href, preserveDevice);

    return <Link ref={ref} href={preservedHref} {...rest} />;
  },
);

PreservedDeviceLink.displayName = 'PreservedDeviceLink';

export default PreservedDeviceLink;
