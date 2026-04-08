import { NextResponse } from 'next/server';

import { TEMPO_MAINNET_CHAIN_ID, TEMPO_TESTNET_CHAIN_ID } from '@whatcanirun/shared';
import { processBundle } from '../process-bundle';
import { Credential } from 'mppx';
import { Mppx, tempo } from 'mppx/nextjs';
import { isAddress } from 'viem';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TEMPO_USDC_E_ADDRESS = '0x20C000000000000000000000b9537d11c60E8b50';
const RECIPIENT_ADDRESS = '0x8831C0C0CCB2E45c187A4e3fA92D683c52170407';
const TEMPO_DID_RE = /^did:pkh:eip155:(0|[1-9]\d*):(0x[a-fA-F0-9]{40})$/;

// -----------------------------------------------------------------------------
// MPPX setup
// -----------------------------------------------------------------------------

// MPP is used here solely for wallet identity verification — the 0.00 charge
// proves the caller controls the wallet (via signature) without moving funds.
// The recipient address is unused in practice; actual reward payouts are
// handled separately (see lib/rewards/grant.ts).
const IS_TESTNET = process.env.NODE_ENV !== 'production';
const TEMPO_CHAIN_ID = IS_TESTNET ? TEMPO_TESTNET_CHAIN_ID : TEMPO_MAINNET_CHAIN_ID;

const mppx = Mppx.create({
  methods: [
    tempo.charge({
      ...(!IS_TESTNET && {
        currency: TEMPO_USDC_E_ADDRESS,
      }),
      recipient: RECIPIENT_ADDRESS,
      testnet: IS_TESTNET,
    }),
  ],
});

// -----------------------------------------------------------------------------
// POST — MPPX-gated run upload (reward granted on verification)
// -----------------------------------------------------------------------------

export const POST = mppx.charge({ amount: '0.00' })(async (request: Request) => {
  const formData = await request.formData();
  const bundleFile = formData.get('bundle');
  if (!(bundleFile instanceof File)) {
    return NextResponse.json({ error: 'Missing bundle zip file.' }, { status: 400 });
  }

  const identity = extractVerifiedIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: 'Missing or invalid verified wallet identity.' }, { status: 400 });
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

function extractVerifiedIdentity(
  request: Request,
): { did: string } | null {
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
