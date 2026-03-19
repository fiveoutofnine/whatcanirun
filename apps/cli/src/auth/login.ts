import { randomBytes } from 'node:crypto';

import { type AuthData, saveAuth } from './token';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const API_BASE = process.env.WCIR_API_URL || 'https://whatcani.run';

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export async function loginViaBrowser(): Promise<AuthData> {
  const state = randomBytes(32).toString('hex');

  return new Promise((resolve, reject) => {
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);

        if (url.pathname !== '/callback') {
          return new Response('Not found', { status: 404 });
        }

        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (returnedState !== state) {
          return new Response(page('Authentication failed', 'State mismatch. Please try again.'), {
            headers: { 'Content-Type': 'text/html' },
            status: 400,
          });
        }

        if (!code) {
          return new Response(page('Authentication failed', 'Missing authorization code.'), {
            headers: { 'Content-Type': 'text/html' },
            status: 400,
          });
        }

        // Exchange the code for a CLI token server-side.
        exchangeCode(code)
          .then((authData) => {
            saveAuth(authData);
            setTimeout(() => {
              server.stop();
              resolve(authData);
            }, 100);
          })
          .catch((err) => {
            setTimeout(() => {
              server.stop();
              reject(err);
            }, 100);
          });

        return new Response(page('Authenticated', 'You can close this tab.'), {
          headers: { 'Content-Type': 'text/html' },
        });
      },
    });

    const port = server.port;
    const loginUrl = `${API_BASE}/cli-auth?port=${port}&state=${state}`;

    // Open browser (await to prevent zombie process).
    const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
    const browserProc = Bun.spawn([cmd, loginUrl], { stdout: 'ignore', stderr: 'ignore' });
    browserProc.exited.catch(() => {});

    console.log(`If the browser didn't open, visit: ${loginUrl}`);

    // Timeout after 5 minutes.
    setTimeout(() => {
      server.stop();
      reject(new Error('Login timed out. Please try again.'));
    }, 300_000);
  });
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function exchangeCode(code: string): Promise<AuthData> {
  const res = await fetch(`${API_BASE}/api/v0/auth/cli-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Code exchange failed (${res.status}): ${body}`);
  }

  return (await res.json()) as AuthData;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, message: string): string {
  const t = escapeHtml(title);
  const m = escapeHtml(message);
  return `<!DOCTYPE html>
<html>
<head><title>${t}</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; justify-content: center;
         align-items: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
  .card { text-align: center; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: #a1a1aa; }
</style>
</head>
<body><div class="card"><h1>${t}</h1><p>${m}</p></div></body>
</html>`;
}
