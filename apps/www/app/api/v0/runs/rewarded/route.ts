import { NextResponse } from 'next/server';

import { processBundle } from '../process-bundle';
import { Credential } from 'mppx';
import { isAddress } from 'viem';

import { TEMPO_CHAIN_ID, withTempoIdentityVerification } from '@/lib/services/mppx';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TEMPO_DID_RE = /^did:pkh:eip155:(0|[1-9]\d*):(0x[a-fA-F0-9]{40})$/;

// -----------------------------------------------------------------------------
// POST — MPPX-gated run upload (reward granted on verification)
// -----------------------------------------------------------------------------

export const POST = withTempoIdentityVerification(async (request: Request) => {
  const formData = await request.formData();
  const bundleFile = formData.get('bundle');
  if (!(bundleFile instanceof File)) {
    return NextResponse.json({ error: 'Missing bundle zip file.' }, { status: 400 });
  }

  const identity = extractVerifiedIdentity(request);
  if (!identity) {
    return NextResponse.json(
      { error: 'Missing or invalid verified wallet identity.' },
      { status: 400 },
    );
  }

  // Resolve client IP for spam detection.
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  const result = await processBundle({ bundleFile, ip, did: identity.did });

  if (!result.ok) {
    const body: Record<string, unknown> = { error: result.error };
    if (result.details) body.details = result.details;
    if (result.runId) body.run_id = result.runId;
    return NextResponse.json(body, { status: result.status });
  }

  return NextResponse.json(
    {
      run_id: result.runId,
      did: identity.did,
      status: result.status,
      run_url: result.runUrl,
      reward: 'Pending — reward is granted when the run is verified.',
    },
    { status: 201 },
  );
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function extractVerifiedIdentity(request: Request): { did: string } | null {
  try {
    const credential = Credential.fromRequest(request);
    if (!credential.source) return null;

    const match = TEMPO_DID_RE.exec(credential.source);
    if (!match) return null;

    const [, chainIdText, address] = match;
    if (Number(chainIdText) !== TEMPO_CHAIN_ID || !isAddress(address)) {
      return null;
    }

    return {
      did: `did:pkh:eip155:${chainIdText}:${address}`,
    };
  } catch {
    return null;
  }
}
