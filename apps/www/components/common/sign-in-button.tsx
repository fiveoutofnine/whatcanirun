'use client';

import { signIn } from '@/lib/auth/client';

import { Button } from '@/components/ui';
import type { ButtonProps } from '@/components/ui/button/types';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type SignInButtonProps = ButtonProps & {
  provider?: 'google' | 'github';
  redirect?: string;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const SignInButton: React.FC<SignInButtonProps> = ({
  provider = 'google',
  children = 'Sign in',
  redirect,
  ...rest
}) => {
  const callbackURL = redirect
    ? `/api/auth/callback/${provider}?redirect=${encodeURIComponent(redirect)}`
    : undefined;

  return (
    <Button onClick={() => signIn.social({ provider, callbackURL })} {...rest}>
      {children}
    </Button>
  );
};

export default SignInButton;
