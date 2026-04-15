import { revalidatePath, revalidateTag } from 'next/cache';

import { and, eq, ne } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import { db } from '@/lib/db';
import {
  runs,
  RunStatus,
  view__model_device_summary,
  view__model_stats_by_device,
} from '@/lib/db/schema';
import { FEATURED_MODELS_CACHE_TAG } from '@/lib/utils';

const internalRunStatusSchema = z.object({
  runId: z.string().trim().min(1),
  status: z.nativeEnum(RunStatus),
});

export type InternalRunStatusInput = z.infer<typeof internalRunStatusSchema>;

export function parseInternalRunStatusInput(input: unknown) {
  if (!isObject(input)) {
    return internalRunStatusSchema.safeParse(input);
  }

  return internalRunStatusSchema.safeParse({
    runId: input.runId ?? input.run_id,
    status: input.status,
  });
}

export function isInternalRunStatusRequestAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

export function createInternalRunStatusActionUrl(input: InternalRunStatusInput): string | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return null;

  const url = new URL('/api/internal/runs/status', getBaseUrl());
  url.searchParams.set('runId', input.runId);
  url.searchParams.set('status', input.status);
  url.searchParams.set('signature', signInternalRunStatusAction(input, cronSecret));

  return url.toString();
}

export function hasValidInternalRunStatusSignature(
  input: InternalRunStatusInput,
  signature: string | null,
): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !signature) return false;

  const expected = signInternalRunStatusAction(input, cronSecret);
  if (signature.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function updateRunStatus(input: InternalRunStatusInput) {
  const currentRun = await db.query.runs.findFirst({
    columns: {
      id: true,
      status: true,
    },
    where: (run, { eq }) => eq(run.id, input.runId),
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
    return { ok: false as const, error: 'Run not found.', status: 404 };
  }

  const [updatedRun] = await db
    .update(runs)
    .set({ status: input.status })
    .where(and(eq(runs.id, input.runId), ne(runs.status, input.status)))
    .returning({
      status: runs.status,
    });

  const latestStatus =
    updatedRun?.status ??
    (
      await db.select({ status: runs.status }).from(runs).where(eq(runs.id, input.runId)).limit(1)
    )[0]?.status ??
    currentRun.status;

  const changed = Boolean(updatedRun);

  if (changed) {
    revalidatePath(`/run/${input.runId}`);
    revalidatePath('/runs');

    const touchesVerified =
      currentRun.status === RunStatus.VERIFIED || input.status === RunStatus.VERIFIED;

    if (touchesVerified) {
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
    runId: input.runId,
    previousStatus: currentRun.status,
    status: latestStatus,
    changed,
  };
}

function signInternalRunStatusAction(input: InternalRunStatusInput, secret: string): string {
  return createHmac('sha256', secret).update(`${input.runId}:${input.status}`).digest('hex');
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://whatcani.run';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
