import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createCliCode } from './actions';

import { auth } from '@/lib/auth';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ port?: string; state?: string }>;
}) {
  const { port, state } = await searchParams;

  // Validate required params.
  if (!port || !state || !/^\d+$/.test(port)) {
    return (
      <div className="flex w-full max-w-sm flex-col animate-in fade-in zoom-in-95">
        <h2 className="mb-2 text-2xl font-medium tracking-tight text-gray-12">Invalid request</h2>
        <p className="text-gray-11">
          This page should be opened by the CLI. Run <code>whatcanirun auth login</code>.
        </p>
      </div>
    );
  }

  // Redirect to `/login` if the user isn't logged in.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const returnTo = `/cli-auth?port=${port}&state=${state}`;
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  }

  // Create a short-lived code (5 min) and redirect to the CLI's local server.
  const code = await createCliCode(session.user.id, 300_000);
  const callbackParams = new URLSearchParams({ code, state });
  redirect(`http://localhost:${port}/callback?${callbackParams.toString()}`);
}
