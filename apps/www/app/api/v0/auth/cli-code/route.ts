import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const code = crypto.randomUUID();
  const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const name = `CLI login on ${new Date().toISOString().slice(0, 10)}`;

  await db.insert(apiTokens).values({
    name,
    code,
    codeExpiresAt,
    userId: session.user.id,
  });

  return NextResponse.json({ code });
}
