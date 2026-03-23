// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RuntimeInfo {
  name: string;
  version: string;
  build_flags?: string;
}

export interface BenchTrial {
  promptTps: number;
  generationTps: number;
  peakMemoryGb: number;
}

export interface BenchResult {
  promptTokens: number;
  completionTokens: number;
  trials: BenchTrial[];
  averages: {
    promptTps: number;
    generationTps: number;
    peakMemoryGb: number;
    idleMemoryGb: number;
  };
}

export interface BenchOpts {
  model: string;
  promptTokens: number;
  genTokens: number;
  numTrials: number;
  signal?: AbortSignal;
  onProgress?: (msg: string) => void;
}

export interface RuntimeAdapter {
  name: string;
  detect(): Promise<RuntimeInfo | null>;
  benchmark(opts: BenchOpts): Promise<BenchResult>;
}
