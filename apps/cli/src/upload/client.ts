import { readFileSync } from 'node:fs';

import { getToken } from '../auth/token';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UploadResult {
  run_id: string;
  status: string;
  run_url: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const API_BASE = process.env.WCIR_API_URL || 'https://whatcani.run';

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

async function fetchNonce(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v0/nonce`);
  if (!res.ok) {
    throw new Error(`Failed to fetch nonce: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { nonce: string };
  return data.nonce;
}

export async function uploadBundle(bundlePath: string): Promise<UploadResult> {
  // 1. Fetch a fresh nonce
  const nonce = await fetchNonce();

  // 2. Read the bundle zip
  const zipBytes = readFileSync(bundlePath);
  const blob = new Blob([zipBytes], { type: 'application/zip' });

  // 3. Build multipart form
  const form = new FormData();
  form.append('bundle', blob, bundlePath.split('/').pop() || 'bundle.zip');
  form.append('nonce', nonce);

  // 4. Submit
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/v0/runs`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }

  return (await res.json()) as UploadResult;
}
