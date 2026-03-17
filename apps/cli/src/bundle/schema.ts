import type { BenchResult } from '../runtime/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface Manifest {
  schema_version: string;
  bundle_id: string;
  created_at: string;
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
    source?: string;
    file_size_bytes?: number;
    parameters?: string;
    quant?: string;
    architecture?: string;
  };
  bench: {
    promptTokens: number;
    completionTokens: number;
    trialsTotal: number;
    trialsPassed: number;
    averages: {
      promptTps: number;
      generationTps: number;
      peakMemoryGb: number;
    };
  };
  metrics: {
    ttftP50Ms: number;
    ttftP95Ms: number;
    decodeTpsMean: number;
    weightedTpsMean: number;
    peakRssMb: number;
  };
  notes?: string;
}

export interface Results {
  trials: BenchResult['trials'];
  averages: BenchResult['averages'];
}

// -----------------------------------------------------------------------------
// Validators
// -----------------------------------------------------------------------------

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
    'bench',
    'metrics',
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
    errors.push("Missing or invalid 'trials' array");
    return errors;
  }

  if (!r.averages || typeof r.averages !== 'object') {
    errors.push("Missing or invalid 'averages' object");
  }

  for (let i = 0; i < r.trials.length; i++) {
    const trial = r.trials[i] as Record<string, unknown>;
    const requiredFields = ['promptTps', 'generationTps', 'peakMemoryGb'];
    for (const field of requiredFields) {
      if (!(field in trial)) {
        errors.push(`Trial ${i}: missing field '${field}'`);
      }
    }
  }

  return errors;
}
