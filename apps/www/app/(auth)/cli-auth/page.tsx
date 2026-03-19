import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createCliCode } from './actions';

import { auth } from '@/lib/auth';
import { cliAuthSearchParamsSchema } from '@/lib/schemas/auth';

import ErrorLayout from '@/components/layouts/error';
import { Code } from '@/components/templates/mdx';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ port?: string; state?: string }>;
}) {
  const result = cliAuthSearchParamsSchema.safeParse(await searchParams);
  if (!result.success) {
    return (
      <ErrorLayout
        statusCode={400}
        title="Invalid request"
        message={
          <span>
            This page should be opened by the CLI. Run{' '}
            <Code className="select-all">wcir auth login</Code>.
          </span>
        }
      />
    );
  }

  const { port, state } = result.data;

  // Redirect to `/login` if the user isn't logged in.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const returnTo = `/cli-auth?port=${port}&state=${state}`;
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  }

  // Create a short-lived code (5 min) and redirect to the CLI's local server.
  let code: string;
  try {
    code = await createCliCode(session.user.id, 300_000);
  } catch {
    return (
      <ErrorLayout
        statusCode={429}
        title="Too many requests"
        message="Too many pending login codes. Please wait a few minutes and try again."
      />
    );
  }
  const callbackParams = new URLSearchParams({ code, state });
  redirect(`http://localhost:${port}/callback?${callbackParams.toString()}`);
}
