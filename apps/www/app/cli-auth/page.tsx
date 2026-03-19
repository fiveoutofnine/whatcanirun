'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { signIn, useSession } from '@/lib/auth/client';

type Status = 'idle' | 'pending' | 'redirecting' | 'error';

export default function CliAuthPage() {
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const port = params?.get('port') ?? null;
  const state = params?.get('state') ?? null;

  const exchangeCode = useCallback(async () => {
    if (!port || !state) return;
    setStatus('redirecting');
    try {
      const res = await fetch('/api/v0/auth/cli-code', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create auth code');
      const data = (await res.json()) as { code: string };
      const callbackParams = new URLSearchParams({ code: data.code, state });
      window.location.href = `http://localhost:${port}/callback?${callbackParams.toString()}`;
    } catch (e) {
      startedRef.current = false;
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Authentication failed');
    }
  }, [port, state]);

  useEffect(() => {
    if (!session || !port || !state || startedRef.current) return;
    startedRef.current = true;
    exchangeCode();
  }, [session, port, state, exchangeCode]);

  if (!port || !state) {
    return (
      <Layout>
        <h1>Invalid request</h1>
        <p>This page should be opened by the CLI. Run `whatcanirun auth login`.</p>
      </Layout>
    );
  }

  if (isPending || status === 'pending') {
    return (
      <Layout>
        <p className="text-zinc-400">Loading...</p>
      </Layout>
    );
  }

  if (status === 'redirecting') {
    return (
      <Layout>
        <p className="text-zinc-400">Redirecting to CLI...</p>
      </Layout>
    );
  }

  if (status === 'error') {
    return (
      <Layout>
        <h1>Error</h1>
        <p className="text-red-400">{error}</p>
      </Layout>
    );
  }

  const callbackURL = `/cli-auth?port=${port}&state=${state}`;

  return (
    <Layout>
      <h1>Sign in to whatcani.run</h1>
      <p>Authenticate to submit benchmark results from the CLI.</p>
      <div className="mt-8 flex flex-col gap-3">
        <button onClick={() => signIn.social({ provider: 'github', callbackURL })} className="btn">
          Continue with GitHub
        </button>
        <button onClick={() => signIn.social({ provider: 'google', callbackURL })} className="btn">
          Continue with Google
        </button>
      </div>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-sans text-zinc-50">
      <main className="flex w-full max-w-sm flex-col items-center text-center [&_.btn]:w-full [&_.btn]:rounded-lg [&_.btn]:bg-zinc-800 [&_.btn]:px-4 [&_.btn]:py-3 [&_.btn]:font-medium [&_.btn]:text-zinc-50 [&_.btn]:transition-colors hover:[&_.btn]:bg-zinc-700 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_p]:text-zinc-400">
        {children}
      </main>
    </div>
  );
}
