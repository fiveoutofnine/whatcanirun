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

export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = [];
  const m = manifest as Record<string, unknown>;

  const required = [
    'schema_version',
    'bundle_id',
    'created_at',
    'task',
    'scenario_id',
    'harness',
    'device',
    'runtime',
    'model',
  ];

  for (const field of required) {
    if (!(field in m)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (m.task !== 'llm.generate.v1') {
    errors.push(`Invalid task: ${m.task}. Expected: llm.generate.v1`);
  }

  const validScenarios = ['chat_short_v1', 'chat_long_v1'];
  if (!validScenarios.includes(m.scenario_id as string)) {
    errors.push(`Invalid scenario_id: ${m.scenario_id}`);
  }

  return errors;
}

export function validateResults(results: unknown): string[] {
  const errors: string[] = [];
  const r = results as Record<string, unknown>;

  if (!Array.isArray(r.trials)) {
    errors.push("Missing or invalid 'trials' array");
    return errors;
  }

  if (!r.aggregate || typeof r.aggregate !== 'object') {
    errors.push("Missing or invalid 'aggregate' object");
  }

  for (let i = 0; i < r.trials.length; i++) {
    const trial = r.trials[i] as Record<string, unknown>;
    const requiredFields = [
      'input_tokens',
      'output_tokens',
      'ttft_ms',
      'total_ms',
      'decode_tps',
      'weighted_tps',
      'exit_status',
    ];
    for (const field of requiredFields) {
      if (!(field in trial)) {
        errors.push(`Trial ${i}: missing field '${field}'`);
      }
    }
  }

  return errors;
}

export function validatePlausibility(aggregate: AggregateMetrics): string[] {
  const errors: string[] = [];

  if (aggregate.decode_tps_mean <= 0 || aggregate.decode_tps_mean >= 10000) {
    errors.push(
      `decode_tps_mean out of range: ${aggregate.decode_tps_mean} (expected 0 < x < 10000)`,
    );
  }

  if (aggregate.ttft_p50_ms <= 0) {
    errors.push(`ttft_p50_ms must be positive: ${aggregate.ttft_p50_ms}`);
  }

  if (aggregate.trials_passed < 1) {
    errors.push(`trials_passed must be >= 1: ${aggregate.trials_passed}`);
  }

  if (aggregate.trials_total > 20) {
    errors.push(`trials_total must be <= 20: ${aggregate.trials_total}`);
  }

  return errors;
}
