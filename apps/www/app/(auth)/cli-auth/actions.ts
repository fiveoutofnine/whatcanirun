'use server';

import { and, eq, isNotNull, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_PENDING_CODES = 10;

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------

export async function createCliCode(userId: string, ttlMs: number): Promise<string> {
  // Clean up expired, unredeemed codes for this user.
  await db
    .delete(apiTokens)
    .where(
      and(
        eq(apiTokens.userId, userId),
        isNotNull(apiTokens.code),
        lt(apiTokens.codeExpiresAt, new Date()),
      ),
    );

  // Enforce a cap on active pending codes.
  const pending = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(and(eq(apiTokens.userId, userId), isNotNull(apiTokens.code)));

  if (pending.length >= MAX_PENDING_CODES) {
    throw new Error('Too many pending login codes. Please try again later.');
  }

  const code = crypto.randomUUID();
  const codeExpiresAt = new Date(Date.now() + ttlMs);
  const name = `CLI login on ${new Date().toISOString().slice(0, 10)}`;

  await db.insert(apiTokens).values({ name, code, codeExpiresAt, userId });

  return code;
}
