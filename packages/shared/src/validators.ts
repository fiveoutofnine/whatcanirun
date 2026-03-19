export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = [];
  const m = manifest as Record<string, unknown>;

  const required = [
    'schema_version',
    'bundle_id',
    'created_at',
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

  return errors;
}

export function validateResults(results: unknown): string[] {
  const errors: string[] = [];
  const r = results as Record<string, unknown>;

  if (!Array.isArray(r.trials)) {
    errors.push('Missing or invalid `trials` array.');
    return errors;
  }

  if (!r.aggregate || typeof r.aggregate !== 'object') {
    errors.push('Missing or invalid `aggregate` object.');
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
        errors.push(`Trial ${i}: missing field \`${field}\`.`);
      }
    }
  }

  return errors;
}
