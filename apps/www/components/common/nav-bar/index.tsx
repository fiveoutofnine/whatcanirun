import { headers } from 'next/headers';
import { Fragment } from 'react';

import NavBarDesktop from './desktop';
import NavBarMobile from './mobile';

import type { Session } from '@/lib/auth';
import { auth } from '@/lib/auth';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export type NavBarInternalProps = {
  user?: Session['user'];
  loading?: boolean;
};

type NavBarFallbackProps = {
  children?: React.ReactNode;
};

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

const NavBar: React.FC & { Fallback: React.FC<NavBarFallbackProps> } = async () => {
  let user: Session['user'] | undefined;
  try {
    user = (await auth.api.getSession({ headers: await headers() }))?.user;
  } catch {
    // Render as logged out in case of failed database connection.
  }

  return (
    <Fragment>
      <NavBarDesktop user={user} />
      <NavBarMobile user={user} />
    </Fragment>
  );
};

const NavBarFallback: React.FC<NavBarFallbackProps> = () => {
  return (
    <Fragment>
      <NavBarDesktop loading />
      <NavBarMobile loading />
    </Fragment>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

NavBar.Fallback = NavBarFallback;

export default NavBar;
