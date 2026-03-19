// -----------------------------------------------------------------------------
// Bundle types
// -----------------------------------------------------------------------------

export interface Manifest {
  schema_version: string;
  bundle_id: string;
  created_at: string;
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
    source?: string;
    file_size_bytes?: number;
    parameters?: string;
    quant?: string;
    architecture?: string;
  };
  context_length?: number;
  notes?: string;
}

export interface ResultTrial {
  input_tokens: number;
  output_tokens: number;
  ttft_ms: number;
  total_ms: number;
  decode_tps: number;
  weighted_tps: number;
  peak_rss_mb: number;
  exit_status: string;
}

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

export interface Results {
  trials: ResultTrial[];
  aggregate: AggregateMetrics;
}

export interface DerivedMetrics {
  ttftP50Ms: number;
  ttftP95Ms: number;
  decodeTpsMean: number;
  weightedTpsMean: number;
  peakRssMb: number;
}
