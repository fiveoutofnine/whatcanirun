import { describe, expect, test } from 'bun:test';

import { inferModelFromName } from './resolve';

describe('inferModelFromName', () => {
  test('preserves an exact Hugging Face GGUF file reference as the source', () => {
    const modelRef = 'unsloth/Qwen3.8-27B-GGUF:Qwen3.8-27B-UD-Q4_K_M.gguf';

    expect(inferModelFromName(modelRef)).toMatchObject({
      display_name: 'Qwen3.8-27B-UD-Q4_K_M.gguf',
      format: 'gguf',
      source: modelRef,
    });
  });

  test('keeps a bare Hugging Face repository as the source for MLX', () => {
    const modelRef = 'mlx-community/Qwen3.5-4B-4bit';

    expect(inferModelFromName(modelRef)).toMatchObject({
      format: 'mlx',
      source: modelRef,
    });
  });
});
