import { NextResponse } from 'next/server';

import { processBundle } from '../process-bundle';
import { Mppx, tempo } from 'mppx/nextjs';
import { isAddress } from 'viem';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TEMPO_CHAIN_ID = 42431;
const TEMPO_USDC_E_ADDRESS = '0x20C000000000000000000000b9537d11c60E8b50';
const RECIPIENT_ADDRESS = '0x8831C0C0CCB2E45c187A4e3fA92D683c52170407';

// -----------------------------------------------------------------------------
// MPPX setup
// -----------------------------------------------------------------------------

// MPP is used here solely for wallet identity verification — the 0.00 charge
// proves the caller controls the wallet (via signature) without moving funds.
// The recipient address is unused in practice; actual reward payouts are
// handled separately (see lib/rewards/grant.ts).
const IS_TESTNET = process.env.NODE_ENV !== 'production';

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

  // Wallet address is required for reward identity.
  const walletAddress = formData.get('wallet_address') as string | null;
  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: 'Missing or invalid `wallet_address`.' }, { status: 400 });
  }

  const did = `did:pkh:eip155:${TEMPO_CHAIN_ID}:${walletAddress}`;

  // Resolve client IP for spam detection.
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  const result = await processBundle({ bundleFile, ip, did });

  if (!result.ok) {
    const body: Record<string, unknown> = { error: result.error };
    if (result.details) body.details = result.details;
    if (result.runId) body.run_id = result.runId;
    return NextResponse.json(body, { status: result.status });
  }

  return NextResponse.json(
    {
      run_id: result.runId,
      did,
      status: result.status,
      run_url: result.runUrl,
      reward: 'Pending — reward is granted when the run is verified.',
    },
    { status: 201 },
  );
});
