import { readFileSync } from 'node:fs';

import { getWallet } from '../wallet/wallet';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RewardedUploadResult {
  run_id: string;
  did: string;
  status: string;
  run_url: string;
  reward: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const API_BASE = process.env.WCIR_API_URL || 'https://whatcani.run';

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

export async function uploadBundleRewarded(
  bundlePath: string,
  options?: { signal?: AbortSignal },
): Promise<RewardedUploadResult> {
  const wallet = getWallet();
  if (!wallet) {
    throw new Error('No rewards wallet found. Run `wcir rewards opt-in` first.');
  }

  // Lazy-import mppx client + viem to keep CLI startup fast
  const [{ Mppx, tempo }, { privateKeyToAccount }] = await Promise.all([
    import('mppx/client'),
    import('viem/accounts'),
  ]);

  const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
  const mppx = Mppx.create({
    methods: [tempo({ account })],
    polyfill: false,
  });

  // Read and hash the bundle
  const zipBytes = readFileSync(bundlePath);
  const hashBuffer = await crypto.subtle.digest('SHA-256', zipBytes);
  const bundleSha256 = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const blob = new Blob([zipBytes], { type: 'application/zip' });

  // Build multipart form
  const form = new FormData();
  form.append('bundle', blob, bundlePath.split('/').pop() || 'bundle.zip');
  form.append('bundle_sha256', bundleSha256);
  form.append('wallet_address', wallet.address);

  // Submit via mppx (handles 402 payment flow automatically)
  const res = await mppx.fetch(`${API_BASE}/api/v0/runs/rewarded`, {
    method: 'POST',
    body: form,
    signal: options?.signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }

  return (await res.json()) as RewardedUploadResult;
}
