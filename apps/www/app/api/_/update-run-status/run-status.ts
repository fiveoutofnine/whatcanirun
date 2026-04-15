import { createHmac } from 'node:crypto';

import { RunStatus } from '@/lib/db/schema';

export function createUpdateRunStatusActionUrl(runId: string, status: RunStatus): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;

  const url = new URL(
    '/api/_/update-run-status',
    process.env.NEXT_PUBLIC_BASE_URL ?? 'https://whatcani.run',
  );
  url.searchParams.set('runId', runId);
  url.searchParams.set('status', status);
  url.searchParams.set(
    'signature',
    createHmac('sha256', secret).update(`${runId}:${status}`).digest('hex'),
  );

  return url.toString();
}
