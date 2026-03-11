import type { TrialResult } from './collector';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AggregateMetrics {
  ttft_p50_ms: number;
  ttft_p95_ms: number;
  decode_tps_mean: number;
  weighted_tps_mean: number;
  idle_rss_mb: number;
  peak_rss_mb: number;
  trials_passed: number;
  trials_total: number;
}

// -----------------------------------------------------------------------------
// Function
// -----------------------------------------------------------------------------

export function computeAggregates(trials: TrialResult[]): AggregateMetrics {
  const passed = trials.filter((t) => t.exit_status === 0);
  const ttfts = passed.map((t) => t.ttft_ms).sort((a, b) => a - b);

  return {
    ttft_p50_ms: Math.round(percentile(ttfts, 50) * 10) / 10,
    ttft_p95_ms: Math.round(percentile(ttfts, 95) * 10) / 10,
    decode_tps_mean: Math.round(mean(passed.map((t) => t.decode_tps)) * 10) / 10,
    weighted_tps_mean: Math.round(mean(passed.map((t) => t.weighted_tps)) * 10) / 10,
    idle_rss_mb: passed.length > 0 ? passed[0]!.idle_rss_mb : 0,
    peak_rss_mb: Math.max(...trials.map((t) => t.peak_rss_mb), 0),
    trials_passed: passed.length,
    trials_total: trials.length,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  const weight = index - lower;

  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((a, b) => a + b, 0) / values.length;
}
