import { notifyMissingModelMetadataActionItem } from './metadata-action';
import { processBundle } from './process-bundle';

import { scheduleNewRunSubmittedNotification } from '@/lib/services/telegram';

export async function submitRun(input: Parameters<typeof processBundle>[0]) {
  const result = await processBundle(input);

  if (result.ok) {
    scheduleNewRunSubmittedNotification(result.runUrl);

    try {
      await notifyMissingModelMetadataActionItem({
        modelId: result.modelId,
        runId: result.runId,
        runUrl: result.runUrl,
      });
    } catch (error) {
      console.error(`Failed to prepare/send model metadata action item for ${result.runId}:`, error);
    }
  }

  return result;
}
