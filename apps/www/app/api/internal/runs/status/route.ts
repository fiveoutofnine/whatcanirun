import { NextRequest, NextResponse } from 'next/server';

import {
  hasValidInternalRunStatusSignature,
  isInternalRunStatusRequestAuthorized,
  parseInternalRunStatusInput,
  updateRunStatus,
} from '@/lib/services/run-status';

export async function POST(request: NextRequest) {
  if (!isInternalRunStatusRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = parseInternalRunStatusInput(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid run status payload.' }, { status: 400 });
  }

  const result = await updateRunStatus(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    run_id: result.runId,
    previous_status: result.previousStatus,
    status: result.status,
    changed: result.changed,
    reward_granted: result.rewardGranted,
  });
}

export async function GET(request: NextRequest) {
  const parsed = parseInternalRunStatusInput({
    runId: request.nextUrl.searchParams.get('runId') ?? request.nextUrl.searchParams.get('run_id'),
    status: request.nextUrl.searchParams.get('status'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid run status payload.' }, { status: 400 });
  }

  if (
    !hasValidInternalRunStatusSignature(parsed.data, request.nextUrl.searchParams.get('signature'))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await updateRunStatus(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.redirect(new URL(`/run/${result.runId}`, request.nextUrl.origin));
}
