import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { and, eq, ne } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { db } from '@/lib/db';
import {
  runs,
  RunStatus,
  view__model_device_summary,
  view__model_stats_by_device,
} from '@/lib/db/schema';
import { FEATURED_MODELS_CACHE_TAG } from '@/lib/utils';

const RUN_STATUSES = new Set<RunStatus>(Object.values(RunStatus));

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body == null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid run status payload.' }, { status: 400 });
  }

  const runId =
    typeof body.runId === 'string'
      ? body.runId.trim()
      : typeof body.run_id === 'string'
        ? body.run_id.trim()
        : '';
  const status =
    typeof body.status === 'string' && RUN_STATUSES.has(body.status as RunStatus)
      ? (body.status as RunStatus)
      : null;

  if (!runId || !status) {
    return NextResponse.json({ error: 'Invalid run status payload.' }, { status: 400 });
  }

  const result = await updateRunStatus(runId, status);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.json({
    ok: true,
    run_id: result.runId,
    previous_status: result.previousStatus,
    status: result.status,
    changed: result.changed,
  });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const runId =
    request.nextUrl.searchParams.get('runId')?.trim() ??
    request.nextUrl.searchParams.get('run_id')?.trim() ??
    '';
  const statusParam = request.nextUrl.searchParams.get('status');

  if (!runId || !statusParam || !RUN_STATUSES.has(statusParam as RunStatus)) {
    return NextResponse.json({ error: 'Invalid run status payload.' }, { status: 400 });
  }

  if (!secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const signature = request.nextUrl.searchParams.get('signature');
  const expectedSignature = createHmac('sha256', secret)
    .update(`${runId}:${statusParam}`)
    .digest('hex');

  if (
    !signature ||
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await updateRunStatus(runId, statusParam as RunStatus);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.redirect(new URL(`/run/${result.runId}`, request.nextUrl.origin));
}

async function updateRunStatus(runId: string, status: RunStatus) {
  const currentRun = await db.query.runs.findFirst({
    columns: {
      id: true,
      status: true,
    },
    where: (run, { eq }) => eq(run.id, runId),
    with: {
      model: {
        columns: {
          id: true,
        },
        with: {
          info: {
            columns: {
              artifactSha256: true,
            },
            with: {
              family: {
                columns: {
                  slug: true,
                },
                with: {
                  org: {
                    columns: {
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!currentRun) {
    return { ok: false as const, error: 'Run not found.', statusCode: 404 };
  }

  const [updatedRun] = await db
    .update(runs)
    .set({ status })
    .where(and(eq(runs.id, runId), ne(runs.status, status)))
    .returning({ status: runs.status });

  const latestStatus =
    updatedRun?.status ??
    (await db.select({ status: runs.status }).from(runs).where(eq(runs.id, runId)).limit(1))[0]
      ?.status ??
    currentRun.status;

  if (updatedRun) {
    revalidatePath(`/run/${runId}`);
    revalidatePath('/runs');

    if (currentRun.status === RunStatus.VERIFIED || status === RunStatus.VERIFIED) {
      await Promise.all([
        db.refreshMaterializedView(view__model_stats_by_device),
        db.refreshMaterializedView(view__model_device_summary),
      ]);

      revalidateTag(FEATURED_MODELS_CACHE_TAG, 'max');
      revalidatePath('/');
      revalidatePath('/device');
      revalidatePath('/models');
      revalidatePath('/api/model-families');

      const orgSlug = currentRun.model.info?.family?.org?.slug;
      const familySlug = currentRun.model.info?.family?.slug;

      if (orgSlug) {
        revalidatePath(`/${orgSlug}`);
      }

      if (orgSlug && familySlug) {
        revalidatePath(`/${orgSlug}/${familySlug}`);
        revalidatePath(`/${orgSlug}/${familySlug}/runs`);
      }
    }
  }

  return {
    ok: true as const,
    runId,
    previousStatus: currentRun.status,
    status: latestStatus,
    changed: Boolean(updatedRun),
  };
}
