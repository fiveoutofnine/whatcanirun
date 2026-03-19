import { NextRequest, NextResponse } from 'next/server';

import { and, eq, gt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { apiTokens, users } from '@/lib/db/schema';
import { sha256 } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { code?: string };
  if (!body.code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  // Generate the raw token and its hash.
  const rawToken = `wcir_${crypto.randomUUID().replace(/-/g, '')}`;
  const tokenHash = await sha256(rawToken);

  // Atomically consume the code: only match if code exists and hasn't expired.
  const [row] = await db
    .update(apiTokens)
    .set({ code: null, codeExpiresAt: null, tokenHash })
    .where(and(eq(apiTokens.code, body.code), gt(apiTokens.codeExpiresAt, new Date())))
    .returning({ userId: apiTokens.userId });

  if (!row) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
  }

  // Fetch user details.
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  return NextResponse.json({
    token: rawToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
