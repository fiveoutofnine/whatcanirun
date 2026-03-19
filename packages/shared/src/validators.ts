// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireString(
  obj: Record<string, unknown>,
  field: string,
  prefix: string,
  errors: string[],
): void {
  if (typeof obj[field] !== 'string') {
    errors.push(`${prefix}missing or invalid \`${field}\` (expected string).`);
  }
}

function requireNumber(
  obj: Record<string, unknown>,
  field: string,
  prefix: string,
  errors: string[],
): void {
  if (typeof obj[field] !== 'number') {
    errors.push(`${prefix}missing or invalid \`${field}\` (expected number).`);
  }
}

// -----------------------------------------------------------------------------
// validateManifest
// -----------------------------------------------------------------------------

export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = [];

  if (!isObject(manifest)) {
    errors.push('Manifest must be an object.');
    return errors;
  }

  const m = manifest;

  // Top-level scalars.
  requireString(m, 'schema_version', '', errors);
  requireString(m, 'bundle_id', '', errors);
  requireString(m, 'created_at', '', errors);

  // harness
  if (!isObject(m.harness)) {
    errors.push('Missing or invalid `harness` (expected object).');
  } else {
    requireString(m.harness, 'version', '`harness.`', errors);
    requireString(m.harness, 'git_sha', '`harness.`', errors);
  }

  // device
  if (!isObject(m.device)) {
    errors.push('Missing or invalid `device` (expected object).');
  } else {
    requireString(m.device, 'cpu', '`device.`', errors);
    requireString(m.device, 'gpu', '`device.`', errors);
    requireNumber(m.device, 'ram_gb', '`device.`', errors);
    requireString(m.device, 'os_name', '`device.`', errors);
    requireString(m.device, 'os_version', '`device.`', errors);
  }

  // runtime
  if (!isObject(m.runtime)) {
    errors.push('Missing or invalid `runtime` (expected object).');
  } else {
    requireString(m.runtime, 'name', '`runtime.`', errors);
    requireString(m.runtime, 'version', '`runtime.`', errors);
  }

  // model
  if (!isObject(m.model)) {
    errors.push('Missing or invalid `model` (expected object).');
  } else {
    requireString(m.model, 'display_name', '`model.`', errors);
    requireString(m.model, 'format', '`model.`', errors);
    requireString(m.model, 'artifact_sha256', '`model.`', errors);
  }

  return errors;
}

// -----------------------------------------------------------------------------
// validateResults
// -----------------------------------------------------------------------------

export function validateResults(results: unknown): string[] {
  const errors: string[] = [];

  if (!isObject(results)) {
    errors.push('Results must be an object.');
    return errors;
  }

  const r = results;

  if (!Array.isArray(r.trials)) {
    errors.push('Missing or invalid `trials` array.');
    return errors;
  }

  if (!isObject(r.aggregate)) {
    errors.push('Missing or invalid `aggregate` object.');
  }

  for (let i = 0; i < r.trials.length; i++) {
    const trial = r.trials[i] as Record<string, unknown>;
    const prefix = `Trial ${i}: `;
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
        errors.push(`${prefix}missing field \`${field}\`.`);
      }
    }
  }

  return errors;
}
