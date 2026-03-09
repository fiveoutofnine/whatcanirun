import type { AggregateMetrics } from '../metrics/aggregator.ts';
import type { TrialResult } from '../metrics/collector.ts';

export interface Manifest {
  schema_version: string;
  bundle_id: string;
  created_at: string;
  task: string;
  scenario_id: string;
  canonical: boolean;
  harness: {
    version: string;
    git_sha: string;
  };
  device: {
    cpu: string;
    gpu: string;
    ram_gb: number;
    os_name: string;
    os_version: string;
  };
  runtime: {
    name: string;
    version: string;
    build_flags?: string;
  };
  model: {
    display_name: string;
    format: string;
    artifact_sha256: string;
    tokenizer_sha256?: string;
    source?: string;
  };
  quant: {
    name: string | null;
  };
  notes?: string;
  nonce?: string;
}

export interface Results {
  trials: TrialResult[];
  aggregate: AggregateMetrics;
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
