import type { AggregateMetrics } from '@whatcanirun/shared';

export function validatePlausibility(aggregate: AggregateMetrics): string[] {
  const errors: string[] = [];

  if (aggregate.decode_tps_mean <= 0 || aggregate.decode_tps_mean >= 10000) {
    errors.push(
      `\`decode_tps_mean\` out of range: ${aggregate.decode_tps_mean} (expected 0 < x < 10000).`,
    );
  }

  if (aggregate.ttft_p50_ms <= 0) {
    errors.push(`\`ttft_p50_ms\` must be positive: ${aggregate.ttft_p50_ms}.`);
  }

  if (aggregate.trials_passed < 1) {
    errors.push(`\`trials_passed\` must be >= 1: ${aggregate.trials_passed}.`);
  }

  if (aggregate.trials_total > 100) {
    errors.push(`\`trials_total\` must be <= 100: ${aggregate.trials_total}.`);
  }

  return errors;
}
