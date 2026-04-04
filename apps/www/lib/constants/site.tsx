import { Boxes, FileText, Home, Play } from 'lucide-react';

import type { Page } from '@/lib/types/site';

import LogoIcon from '@/components/common/logo-icon';

/**
 * Pages displayed on [**whatcani.run**](https://whatcani.run)'s navigation bar.
 */
export const NAVBAR_PAGES: Page[] = [
  { name: 'Home', slug: '/', icon: <Home /> },
  { name: 'Models', slug: '/models', icon: <Boxes /> },
  { name: 'Runs', slug: '/runs', icon: <Play /> },
  { name: 'Docs', slug: '/docs', icon: <FileText /> },
];

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
