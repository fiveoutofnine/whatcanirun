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
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const NavBar: React.FC = async () => {
  const user = (await auth.api.getSession({ headers: await headers() }))?.user;

  return (
    <Fragment>
      <NavBarDesktop user={user} />
      <NavBarMobile user={user} />
    </Fragment>
  );
};

export default NavBar;
