import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { devices, rewards, runs } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const BASE_REWARD = 0.64;
const DECAY_PER_USE = 0.01;

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

/**
 * Compute and record a reward for a verified run that has a DID.
 *
 * Call this when a run transitions to `verified`. It is a no-op if the run
 * has no DID (wasn't submitted through the rewarded route) or if a reward
 * has already been recorded for that run.
 *
 * Returns the reward row if one was created, or `null` otherwise.
 */
export async function grantRewardForRun(runId: string) {
  const [run] = await db
    .select({
      id: runs.id,
      did: runs.did,
      modelId: runs.modelId,
      deviceId: runs.deviceId,
    })
    .from(runs)
    .where(eq(runs.id, runId))
    .limit(1);

  if (!run?.did) return null;

  // Already rewarded?
  const [existing] = await db
    .select({ id: rewards.id })
    .from(rewards)
    .where(eq(rewards.runId, runId))
    .limit(1);

  if (existing) return null;

  // Resolve chip ID for the device
  const [device] = await db
    .select({ chipId: devices.chipId })
    .from(devices)
    .where(eq(devices.id, run.deviceId))
    .limit(1);

  if (!device) return null;

  // Count prior rewarded uses of this model and device
  const [modelUseRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rewards)
    .where(eq(rewards.modelId, run.modelId));

  const [deviceUseRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rewards)
    .where(eq(rewards.deviceChipId, device.chipId));

  const modelUseCount = modelUseRow?.count ?? 0;
  const deviceUseCount = deviceUseRow?.count ?? 0;
  const modelReward = computeReward(modelUseCount);
  const deviceReward = computeReward(deviceUseCount);
  const totalReward = modelReward + deviceReward;

  if (totalReward === 0) return null;

  const [reward] = await db
    .insert(rewards)
    .values({
      did: run.did,
      runId: run.id,
      modelId: run.modelId,
      deviceChipId: device.chipId,
      modelReward,
      deviceReward,
      totalReward,
    })
    .returning();

  return reward;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function computeReward(useCount: number): number {
  if (useCount === 0) return BASE_REWARD;
  return Math.max(BASE_REWARD - useCount * DECAY_PER_USE, 0);
}
