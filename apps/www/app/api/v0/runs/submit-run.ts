import { processBundle } from './process-bundle';

import { scheduleNewRunSubmittedNotification } from '@/lib/services/telegram';

export async function submitRun(input: Parameters<typeof processBundle>[0]) {
  const result = await processBundle(input);

  if (result.ok) {
    scheduleNewRunSubmittedNotification(result.runId, result.runUrl);
  }

  return result;
}
