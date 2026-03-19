'use server';

import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';

export async function createCliCode(userId: string, ttlMs: number): Promise<string> {
  const code = crypto.randomUUID();
  const codeExpiresAt = new Date(Date.now() + ttlMs);
  const name = `CLI login on ${new Date().toISOString().slice(0, 10)}`;

  await db.insert(apiTokens).values({ name, code, codeExpiresAt, userId });

  return code;
}
