export interface ScenarioDefinition {
  id: string;
  description: string;
  input_tokens: number;
  output_tokens: number;
  warmups: number;
  trials: number;
  batch_size: number;
  temperature: number;
  top_p: number;
  prompt: string;
}
