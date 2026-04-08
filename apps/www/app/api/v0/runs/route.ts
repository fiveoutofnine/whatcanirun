import { NextRequest, NextResponse } from 'next/server';

import { processBundle } from './process-bundle';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';
import { sha256 } from '@/lib/utils';

// -----------------------------------------------------------------------------
// POST
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Parse multipart form.
  const formData = await request.formData();
  const bundleFile = formData.get('bundle');
  if (!(bundleFile instanceof File)) {
    return NextResponse.json({ error: 'Missing bundle zip file.' }, { status: 400 });
  }

  // Authenticate via token in form data (preferred) or Authorization header
  // (fallback). Note: token is optional; `userId` will be null.
  const rawToken =
    (formData.get('token') as string | null) ??
    (request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7)
      : null);

  let userId: string | null = null;
  if (rawToken) {
    const tokenHash = await sha256(rawToken);
    const [apiToken] = await db
      .select({ userId: apiTokens.userId, id: apiTokens.id })
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, tokenHash))
      .limit(1);

    if (!apiToken) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }

    userId = apiToken.userId;
    // Update last-used timestamp.
    await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, apiToken.id));
  }

  // Resolve client IP for spam detection.
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  const result = await processBundle({ bundleFile, ip, userId });

  if (!result.ok) {
    const body: Record<string, unknown> = { error: result.error };
    if (result.details) body.details = result.details;
    if (result.runId) body.run_id = result.runId;
    return NextResponse.json(body, { status: result.status });
  }

  return NextResponse.json(
    { run_id: result.runId, status: result.status, run_url: result.runUrl },
    { status: 201 },
  );
}
