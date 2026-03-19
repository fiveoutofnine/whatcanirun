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

export async function uploadBundle(bundlePath: string): Promise<UploadResult> {
  // 1. Read the bundle zip and compute its SHA-256
  const zipBytes = readFileSync(bundlePath);
  const hashBuffer = await crypto.subtle.digest('SHA-256', zipBytes);
  const bundleSha256 = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const blob = new Blob([zipBytes], { type: 'application/zip' });

  // 2. Build multipart form
  const form = new FormData();
  form.append('bundle', blob, bundlePath.split('/').pop() || 'bundle.zip');
  form.append('bundle_sha256', bundleSha256);

  // 3. Submit
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
