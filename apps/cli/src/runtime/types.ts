export interface RuntimeInfo {
  version: string;
  build_flags?: string;
}

export type TokenEvent =
  | { type: 'token'; text: string; timestamp: number }
  | { type: 'done'; timestamp: number; output_tokens: number }
  | { type: 'error'; message: string; timestamp: number }
  | { type: 'status'; message: string; timestamp: number };

export interface GenerateOpts {
  modelPath: string;
  prompt: string;
  maxTokens: number;
  inputTokens: number;
  temperature: number;
  topP: number;
  runtimeFlags?: string;
}

export interface RuntimeAdapter {
  name: string;
  detect(): Promise<RuntimeInfo | null>;
  generate(opts: GenerateOpts): AsyncGenerator<TokenEvent, void, unknown>;
  getProcessId(): number | null;
}
