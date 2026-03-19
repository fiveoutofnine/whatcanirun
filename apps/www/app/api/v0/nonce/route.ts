import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { nonces } from '@/lib/db/schema';

export async function GET() {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  const [nonce] = await db
    .insert(nonces)
    .values({ expiresAt, createdAt: now })
    .returning({ id: nonces.id });

  return NextResponse.json({ nonce: nonce!.id, expires_at: expiresAt.toISOString() });
}
