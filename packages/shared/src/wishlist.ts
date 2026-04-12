import {
  apple,
  cpu,
  defineFeaturedWishlist,
  featuredGguf,
  featuredMlx,
  gpu,
} from './featured';

const MLX_DEVICE_TYPES = Object.freeze([apple()]);

const LLAMA_CPP_DEVICE_TYPES = Object.freeze([apple(), gpu(), cpu()]);

// Ranking goals:
// - priority controls how aggressively we keep surfacing a model
// - minimumRunsPerDevice sets the desired depth for each normalized device target
// - minimumDistinctDevices sets the desired breadth across normalized device targets
const BREADTH_GOALS = Object.freeze({
  minimumDistinctDevices: 10,
  minimumRunsPerDevice: 4,
  priority: 5,
});

const FLAGSHIP_GOALS = Object.freeze({
  minimumDistinctDevices: 8,
  minimumRunsPerDevice: 3,
  priority: 4,
});

const FRONTIER_GOALS = Object.freeze({
  minimumDistinctDevices: 6,
  minimumRunsPerDevice: 2,
  priority: 3,
});

export const FEATURED_WISHLIST = defineFeaturedWishlist([
  // -----------------------------------------------------------------------------
  // OpenAI
  // -----------------------------------------------------------------------------

  featuredMlx({
    ...FRONTIER_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'gpt-oss-20b (MXFP4 Q8)',
    hfRepoId: 'mlx-community/gpt-oss-20b-MXFP4-Q8',
  }),

  // -----------------------------------------------------------------------------
  // Google DeepMind
  // -----------------------------------------------------------------------------

  featuredMlx({
    ...BREADTH_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Gemma 4 E4B Instruct (4-bit)',
    hfRepoId: 'mlx-community/gemma-4-e4b-it-4bit',
  }),
  featuredMlx({
    ...FLAGSHIP_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Gemma 4 E4B Instruct (8-bit)',
    hfRepoId: 'mlx-community/gemma-4-e4b-it-8bit',
  }),
  featuredMlx({
    ...FRONTIER_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Gemma 4 31B Instruct (4-bit)',
    hfRepoId: 'mlx-community/gemma-4-31b-it-4bit',
  }),
  featuredGguf({
    ...BREADTH_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 E2B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-E2B-it-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-E2B-it-GGUF',
  }),
  featuredGguf({
    ...FLAGSHIP_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 E4B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-E4B-it-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-E4B-it-GGUF',
  }),
  featuredGguf({
    ...FRONTIER_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 26B-A4B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-26B-A4B-it-UD-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-26B-A4B-it-GGUF',
  }),
  featuredGguf({
    ...FRONTIER_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 31B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-31B-it-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-31B-it-GGUF',
  }),

  // -----------------------------------------------------------------------------
  // Alibaba / Qwen
  // -----------------------------------------------------------------------------

  featuredMlx({
    ...BREADTH_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Qwen 3.5 0.8B (8-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-0.8B-MLX-8bit',
  }),
  featuredMlx({
    ...BREADTH_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Qwen 3 1.7B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3-1.7B-4bit',
  }),
  featuredMlx({
    ...FLAGSHIP_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Qwen 3 4B Instruct 2507 (4-bit)',
    hfRepoId: 'mlx-community/Qwen3-4B-Instruct-2507-4bit',
  }),
  featuredMlx({
    ...FLAGSHIP_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Qwen 3.5 9B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-9B-4bit',
  }),
  featuredMlx({
    ...FRONTIER_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Qwen 3.5 35B-A3B (4-bit)',
    hfRepoId: 'mlx-community/Qwen3.5-35B-A3B-4bit',
  }),
  featuredGguf({
    ...FLAGSHIP_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Qwen 3.5 4B (UD Q4_K_XL)',
    hfFileName: 'Qwen3.5-4B-UD-Q4_K_XL.gguf',
    hfRepoId: 'unsloth/Qwen3.5-4B-GGUF',
  }),

  // -----------------------------------------------------------------------------
  // Meta
  // -----------------------------------------------------------------------------

  featuredMlx({
    ...FLAGSHIP_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Llama 3.2 3B Instruct (4-bit)',
    hfRepoId: 'mlx-community/Llama-3.2-3B-Instruct-4bit',
  }),
  featuredMlx({
    ...FRONTIER_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Meta Llama 3.1 8B Instruct (4-bit)',
    hfRepoId: 'mlx-community/Meta-Llama-3.1-8B-Instruct-4bit',
  }),
]);
