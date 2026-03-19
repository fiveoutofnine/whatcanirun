import { FileText, Home, Lock } from 'lucide-react';

import type { Page } from '@/lib/types/site';

import LogoIcon from '@/components/common/logo-icon';

/**
 * Pages displayed on [**whatcani.run**](https://whatcani.run)'s navigation bar.
 */
export const NAVBAR_PAGES: Page[] = [
  { name: 'Home', slug: '/', icon: <Home /> },
  { name: 'About', slug: '/about', icon: <FileText /> },
];

/**
 * Admin-only pages displayed on [**whatcani.run**](https://whatcani.run)'s
 * navigation bar.
 */
export const ADMIN_PAGES: Page[] = [{ name: 'Admin', slug: '/admin', icon: <Lock /> }];

/**
 * External pages displayed on [**whatcani.run**](https://whatcani.run)'s
 * navigation bar.
 */
export const EXTERNAL_PAGES: Page[] = [
  {
    name: 'GitHub',
    slug: 'https://github.com/fiveoutofnine/whatcanirun',
    icon: <LogoIcon.GitHub />,
  },
  { name: 'Twitter', slug: 'https://x.com/fiveoutofnine', icon: <LogoIcon.X /> },
];
