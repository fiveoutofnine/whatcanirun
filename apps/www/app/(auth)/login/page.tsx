import LogoIcon from '@/components/common/logo-icon';
import SignInButton from '@/components/common/sign-in-button';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <div className="flex w-full max-w-sm flex-col animate-in fade-in zoom-in-95">
      <h2 className="mb-4 text-2xl font-medium tracking-tight text-gray-12">
        Sign in to your account
      </h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {(
            [
              {
                provider: 'google',
                label: 'Sign in with Google',
                icon: <LogoIcon.Google color="default" />,
              },
              {
                provider: 'github',
                label: 'Sign in with GitHub',
                icon: <LogoIcon.GitHub className="fill-white" color="current" />,
              },
            ] satisfies {
              provider: 'google' | 'github';
              label: string;
              icon: React.ReactNode;
            }[]
          ).map(({ provider, label, icon, ...rest }, i) => (
            <SignInButton
              key={i}
              className="w-full [&_[button-content]]:grow-[2] [&_[button-content]]:pr-4"
              provider={provider}
              redirect={redirect}
              leftIcon={icon}
              {...rest}
            >
              {label}
            </SignInButton>
          ))}
        </div>
      </div>
    </div>
  );
}
