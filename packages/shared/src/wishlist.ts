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

const LARGE_MODEL_GOALS = Object.freeze({
  minimumDistinctDevices: 2,
  minimumRunsPerDevice: 1,
  priority: 7,
});

const EXTREME_MODEL_GOALS = Object.freeze({
  minimumDistinctDevices: 1,
  minimumRunsPerDevice: 1,
  priority: 8,
});

const GEMMA4_UNSLOTH_GGUF_QUANTS = Object.freeze(['Q4_K_M', 'Q5_K_M', 'Q8_0']);

const QWEN35_SMALL_UNSLOTH_GGUF_QUANTS = Object.freeze([
  'IQ4_NL',
  'IQ4_XS',
  'Q3_K_M',
  'Q3_K_S',
  'Q4_0',
  'Q4_1',
  'Q4_K_M',
  'Q4_K_S',
  'Q5_K_M',
  'Q5_K_S',
  'Q6_K',
  'Q8_0',
  'UD-IQ2_M',
  'UD-IQ2_XXS',
  'UD-IQ3_XXS',
  'UD-Q2_K_XL',
  'UD-Q3_K_XL',
  'UD-Q4_K_XL',
  'UD-Q5_K_XL',
  'UD-Q6_K_XL',
  'UD-Q8_K_XL',
]);

const QWEN35_35B_A3B_UNSLOTH_GGUF_QUANTS = Object.freeze([
  'MXFP4_MOE',
  'Q3_K_M',
  'Q3_K_S',
  'Q4_K_M',
  'Q4_K_S',
  'Q5_K_M',
  'Q5_K_S',
  'Q6_K',
  'Q8_0',
  'UD-IQ2_M',
  'UD-IQ2_XXS',
  'UD-IQ3_S',
  'UD-IQ3_XXS',
  'UD-IQ4_NL',
  'UD-IQ4_XS',
  'UD-Q2_K_XL',
  'UD-Q3_K_XL',
  'UD-Q4_K_L',
  'UD-Q4_K_XL',
  'UD-Q5_K_XL',
  'UD-Q6_K_S',
  'UD-Q6_K_XL',
  'UD-Q8_K_XL',
]);

const QWEN35_122B_A10B_UNSLOTH_GGUF_QUANTS = Object.freeze([
  'MXFP4_MOE',
  'Q3_K_M',
  'Q3_K_S',
  'Q4_K_M',
  'Q4_K_S',
  'Q5_K_M',
  'Q5_K_S',
  'Q6_K',
  'Q8_0',
  'UD-IQ1_M',
  'UD-IQ2_M',
  'UD-IQ2_XXS',
  'UD-IQ3_S',
  'UD-IQ3_XXS',
  'UD-IQ4_NL',
  'UD-IQ4_XS',
  'UD-Q2_K_XL',
  'UD-Q3_K_XL',
  'UD-Q4_K_XL',
  'UD-Q5_K_XL',
  'UD-Q6_K_XL',
  'UD-Q8_K_XL',
]);

const QWEN35_397B_A17B_UNSLOTH_GGUF_QUANTS = Object.freeze([
  'MXFP4_MOE',
  'Q3_K_M',
  'Q3_K_S',
  'Q4_K_M',
  'Q4_K_S',
  'Q5_K_M',
  'Q5_K_S',
  'Q6_K',
  'Q8_0',
  'UD-IQ1_M',
  'UD-IQ2_M',
  'UD-IQ2_XXS',
  'UD-IQ3_S',
  'UD-IQ3_XXS',
  'UD-IQ4_NL',
  'UD-IQ4_XS',
  'UD-Q3_K_M',
  'UD-Q3_K_S',
  'UD-Q3_K_XL',
  'UD-Q4_K_M',
  'UD-Q4_K_S',
  'UD-Q4_K_XL',
  'UD-Q5_K_M',
  'UD-Q5_K_S',
  'UD-Q5_K_XL',
  'UD-Q6_K',
  'UD-Q6_K_XL',
  'UD-Q8_K_XL',
]);

const LIQUIDAI_GGUF_QUANTS = Object.freeze(['Q4_0', 'Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0']);

function buildPrefixedGgufEntries(
  model: {
    displayName: string;
    filePrefix: string;
    goals: {
      minimumDistinctDevices: number;
      minimumRunsPerDevice: number;
      priority: number;
    };
    hfRepoId: string;
  },
  quants: readonly string[],
) {
  return quants.map((quant) =>
    featuredGguf({
      ...model.goals,
      deviceTypes: LLAMA_CPP_DEVICE_TYPES,
      displayName: `${model.displayName} (${quant})`,
      hfFileName: `${model.filePrefix}-${quant}.gguf`,
      hfRepoId: model.hfRepoId,
    }),
  );
}

function buildMlxEntries(
  variants: readonly {
    displayName: string;
    hfRepoId: string;
    minimumDistinctDevices: number;
    minimumRunsPerDevice: number;
    priority: number;
  }[],
) {
  return variants.map((variant) =>
    featuredMlx({
      minimumDistinctDevices: variant.minimumDistinctDevices,
      minimumRunsPerDevice: variant.minimumRunsPerDevice,
      priority: variant.priority,
      deviceTypes: MLX_DEVICE_TYPES,
      displayName: variant.displayName,
      hfRepoId: variant.hfRepoId,
    }),
  );
}

const OPENAI_MLX_WISHLIST = buildMlxEntries([
  {
    ...FLAGSHIP_GOALS,
    displayName: 'gpt-oss-20b (MXFP4 Q4)',
    hfRepoId: 'mlx-community/gpt-oss-20b-MXFP4-Q4',
  },
  {
    ...FRONTIER_GOALS,
    displayName: 'gpt-oss-20b (MXFP4 Q8)',
    hfRepoId: 'mlx-community/gpt-oss-20b-MXFP4-Q8',
  },
  {
    ...LARGE_MODEL_GOALS,
    displayName: 'gpt-oss-120b (4-bit)',
    hfRepoId: 'mlx-community/gpt-oss-120b-4bit',
  },
  {
    ...LARGE_MODEL_GOALS,
    displayName: 'gpt-oss-120b (MXFP4 Q4)',
    hfRepoId: 'mlx-community/gpt-oss-120b-MXFP4-Q4',
  },
  {
    ...EXTREME_MODEL_GOALS,
    displayName: 'gpt-oss-120b (MXFP4 Q8)',
    hfRepoId: 'mlx-community/gpt-oss-120b-MXFP4-Q8',
  },
]);

const GEMMA4_UNSLOTH_GGUF_WISHLIST = [
  ...buildPrefixedGgufEntries(
    {
      displayName: 'Gemma 4 E2B Instruct',
      filePrefix: 'gemma-4-E2B-it',
      goals: BREADTH_GOALS,
      hfRepoId: 'unsloth/gemma-4-E2B-it-GGUF',
    },
    GEMMA4_UNSLOTH_GGUF_QUANTS,
  ),
  ...buildPrefixedGgufEntries(
    {
      displayName: 'Gemma 4 E4B Instruct',
      filePrefix: 'gemma-4-E4B-it',
      goals: FLAGSHIP_GOALS,
      hfRepoId: 'unsloth/gemma-4-E4B-it-GGUF',
    },
    GEMMA4_UNSLOTH_GGUF_QUANTS,
  ),
  ...buildPrefixedGgufEntries(
    {
      displayName: 'Gemma 4 26B-A4B Instruct',
      filePrefix: 'gemma-4-26B-A4B-it-UD',
      goals: FRONTIER_GOALS,
      hfRepoId: 'unsloth/gemma-4-26B-A4B-it-GGUF',
    },
    GEMMA4_UNSLOTH_GGUF_QUANTS,
  ),
  ...buildPrefixedGgufEntries(
    {
      displayName: 'Gemma 4 31B Instruct',
      filePrefix: 'gemma-4-31B-it',
      goals: LARGE_MODEL_GOALS,
      hfRepoId: 'unsloth/gemma-4-31B-it-GGUF',
    },
    GEMMA4_UNSLOTH_GGUF_QUANTS,
  ),
];

const GEMMA4_MLX_WISHLIST = buildMlxEntries([
  { ...BREADTH_GOALS, displayName: 'Gemma 4 E2B Instruct (4-bit)', hfRepoId: 'mlx-community/gemma-4-e2b-it-4bit' },
  { ...BREADTH_GOALS, displayName: 'Gemma 4 E2B Instruct (5-bit)', hfRepoId: 'mlx-community/gemma-4-e2b-it-5bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E2B Instruct (6-bit)', hfRepoId: 'mlx-community/gemma-4-e2b-it-6bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E2B Instruct (8-bit)', hfRepoId: 'mlx-community/gemma-4-e2b-it-8bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E2B Instruct (MXFP8)', hfRepoId: 'mlx-community/gemma-4-e2b-it-mxfp8' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E2B Instruct (NVFP4)', hfRepoId: 'mlx-community/gemma-4-e2b-it-nvfp4' },
  { ...BREADTH_GOALS, displayName: 'Gemma 4 E4B Instruct (4-bit)', hfRepoId: 'mlx-community/gemma-4-e4b-it-4bit' },
  { ...BREADTH_GOALS, displayName: 'Gemma 4 E4B Instruct (5-bit)', hfRepoId: 'mlx-community/gemma-4-e4b-it-5bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E4B Instruct (6-bit)', hfRepoId: 'mlx-community/gemma-4-e4b-it-6bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E4B Instruct (8-bit)', hfRepoId: 'mlx-community/gemma-4-e4b-it-8bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E4B Instruct (MXFP8)', hfRepoId: 'mlx-community/gemma-4-e4b-it-mxfp8' },
  { ...FLAGSHIP_GOALS, displayName: 'Gemma 4 E4B Instruct (NVFP4)', hfRepoId: 'mlx-community/gemma-4-e4b-it-nvfp4' },
  { ...FRONTIER_GOALS, displayName: 'Gemma 4 26B-A4B Instruct (4-bit)', hfRepoId: 'mlx-community/gemma-4-26b-a4b-it-4bit' },
  { ...FRONTIER_GOALS, displayName: 'Gemma 4 26B-A4B Instruct (5-bit)', hfRepoId: 'mlx-community/gemma-4-26b-a4b-it-5bit' },
  { ...FRONTIER_GOALS, displayName: 'Gemma 4 26B-A4B Instruct (6-bit)', hfRepoId: 'mlx-community/gemma-4-26b-a4b-it-6bit' },
  { ...FRONTIER_GOALS, displayName: 'Gemma 4 26B-A4B Instruct (8-bit)', hfRepoId: 'mlx-community/gemma-4-26b-a4b-it-8bit' },
  { ...FRONTIER_GOALS, displayName: 'Gemma 4 26B-A4B Instruct (MXFP8)', hfRepoId: 'mlx-community/gemma-4-26b-a4b-it-mxfp8' },
  { ...FRONTIER_GOALS, displayName: 'Gemma 4 26B-A4B Instruct (NVFP4)', hfRepoId: 'mlx-community/gemma-4-26b-a4b-it-nvfp4' },
  { ...LARGE_MODEL_GOALS, displayName: 'Gemma 4 31B Instruct (4-bit)', hfRepoId: 'mlx-community/gemma-4-31b-it-4bit' },
  { ...LARGE_MODEL_GOALS, displayName: 'Gemma 4 31B Instruct (5-bit)', hfRepoId: 'mlx-community/gemma-4-31b-it-5bit' },
  { ...LARGE_MODEL_GOALS, displayName: 'Gemma 4 31B Instruct (6-bit)', hfRepoId: 'mlx-community/gemma-4-31b-it-6bit' },
  { ...LARGE_MODEL_GOALS, displayName: 'Gemma 4 31B Instruct (8-bit)', hfRepoId: 'mlx-community/gemma-4-31b-it-8bit' },
  { ...LARGE_MODEL_GOALS, displayName: 'Gemma 4 31B Instruct (MXFP8)', hfRepoId: 'mlx-community/gemma-4-31b-it-mxfp8' },
  { ...LARGE_MODEL_GOALS, displayName: 'Gemma 4 31B Instruct (NVFP4)', hfRepoId: 'mlx-community/gemma-4-31b-it-nvfp4' },
]);

const QWEN35_UNSLOTH_GGUF_WISHLIST = [
  ...[
    {
      displayName: 'Qwen 3.5 0.8B',
      filePrefix: 'Qwen3.5-0.8B',
      goals: BREADTH_GOALS,
      hfRepoId: 'unsloth/Qwen3.5-0.8B-GGUF',
    },
    {
      displayName: 'Qwen 3.5 2B',
      filePrefix: 'Qwen3.5-2B',
      goals: BREADTH_GOALS,
      hfRepoId: 'unsloth/Qwen3.5-2B-GGUF',
    },
    {
      displayName: 'Qwen 3.5 4B',
      filePrefix: 'Qwen3.5-4B',
      goals: FLAGSHIP_GOALS,
      hfRepoId: 'unsloth/Qwen3.5-4B-GGUF',
    },
    {
      displayName: 'Qwen 3.5 9B',
      filePrefix: 'Qwen3.5-9B',
      goals: FRONTIER_GOALS,
      hfRepoId: 'unsloth/Qwen3.5-9B-GGUF',
    },
  ].flatMap((model) => buildPrefixedGgufEntries(model, QWEN35_SMALL_UNSLOTH_GGUF_QUANTS)),
  ...buildPrefixedGgufEntries(
    {
      displayName: 'Qwen 3.5 35B-A3B',
      filePrefix: 'Qwen3.5-35B-A3B',
      goals: FRONTIER_GOALS,
      hfRepoId: 'unsloth/Qwen3.5-35B-A3B-GGUF',
    },
    QWEN35_35B_A3B_UNSLOTH_GGUF_QUANTS,
  ),
  ...buildPrefixedGgufEntries(
    {
      displayName: 'Qwen 3.5 122B-A10B',
      filePrefix: 'Qwen3.5-122B-A10B',
      goals: LARGE_MODEL_GOALS,
      hfRepoId: 'unsloth/Qwen3.5-122B-A10B-GGUF',
    },
    QWEN35_122B_A10B_UNSLOTH_GGUF_QUANTS,
  ),
  ...buildPrefixedGgufEntries(
    {
      displayName: 'Qwen 3.5 397B-A17B',
      filePrefix: 'Qwen3.5-397B-A17B',
      goals: EXTREME_MODEL_GOALS,
      hfRepoId: 'unsloth/Qwen3.5-397B-A17B-GGUF',
    },
    QWEN35_397B_A17B_UNSLOTH_GGUF_QUANTS,
  ),
];

const QWEN35_MLX_WISHLIST = buildMlxEntries([
  { ...BREADTH_GOALS, displayName: 'Qwen 3.5 0.8B (4-bit)', hfRepoId: 'mlx-community/Qwen3.5-0.8B-MLX-4bit' },
  { ...BREADTH_GOALS, displayName: 'Qwen 3.5 0.8B (8-bit)', hfRepoId: 'mlx-community/Qwen3.5-0.8B-MLX-8bit' },
  { ...BREADTH_GOALS, displayName: 'Qwen 3.5 0.8B (OptiQ 4-bit)', hfRepoId: 'mlx-community/Qwen3.5-0.8B-4bit-OptiQ' },
  { ...BREADTH_GOALS, displayName: 'Qwen 3.5 2B (4-bit)', hfRepoId: 'mlx-community/Qwen3.5-2B-MLX-4bit' },
  { ...BREADTH_GOALS, displayName: 'Qwen 3.5 2B (8-bit)', hfRepoId: 'mlx-community/Qwen3.5-2B-MLX-8bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Qwen 3.5 4B (4-bit)', hfRepoId: 'mlx-community/Qwen3.5-4B-MLX-4bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Qwen 3.5 4B (8-bit)', hfRepoId: 'mlx-community/Qwen3.5-4B-MLX-8bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Qwen 3.5 9B (4-bit)', hfRepoId: 'mlx-community/Qwen3.5-9B-MLX-4bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Qwen 3.5 9B (5-bit)', hfRepoId: 'mlx-community/Qwen3.5-9B-5bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Qwen 3.5 9B (8-bit)', hfRepoId: 'mlx-community/Qwen3.5-9B-MLX-8bit' },
  { ...FLAGSHIP_GOALS, displayName: 'Qwen 3.5 9B (OptiQ 4-bit)', hfRepoId: 'mlx-community/Qwen3.5-9B-OptiQ-4bit' },
  { ...FRONTIER_GOALS, displayName: 'Qwen 3.5 27B (5-bit)', hfRepoId: 'mlx-community/Qwen3.5-27B-5bit' },
  { ...FRONTIER_GOALS, displayName: 'Qwen 3.5 27B (MXFP8)', hfRepoId: 'mlx-community/Qwen3.5-27B-mxfp8' },
  { ...FRONTIER_GOALS, displayName: 'Qwen 3.5 35B-A3B (4-bit)', hfRepoId: 'mlx-community/Qwen3.5-35B-A3B-4bit' },
  { ...EXTREME_MODEL_GOALS, displayName: 'Qwen 3.5 397B-A17B (NVFP4)', hfRepoId: 'mlx-community/Qwen3.5-397B-A17B-nvfp4' },
]);

const LIQUIDAI_GGUF_WISHLIST = [
  ...[
    {
      displayName: 'LFM2 350M',
      filePrefix: 'LFM2-350M',
      goals: BREADTH_GOALS,
      hfRepoId: 'LiquidAI/LFM2-350M-GGUF',
    },
    {
      displayName: 'LFM2 700M',
      filePrefix: 'LFM2-700M',
      goals: BREADTH_GOALS,
      hfRepoId: 'LiquidAI/LFM2-700M-GGUF',
    },
    {
      displayName: 'LFM2 8B-A1B',
      filePrefix: 'LFM2-8B-A1B',
      goals: FLAGSHIP_GOALS,
      hfRepoId: 'LiquidAI/LFM2-8B-A1B-GGUF',
    },
    {
      displayName: 'LFM2 24B-A2B',
      filePrefix: 'LFM2-24B-A2B',
      goals: LARGE_MODEL_GOALS,
      hfRepoId: 'LiquidAI/LFM2-24B-A2B-GGUF',
    },
    {
      displayName: 'LFM2.5 350M',
      filePrefix: 'LFM2.5-350M',
      goals: BREADTH_GOALS,
      hfRepoId: 'LiquidAI/LFM2.5-350M-GGUF',
    },
    {
      displayName: 'LFM2.5 1.2B Base',
      filePrefix: 'LFM2.5-1.2B-Base',
      goals: FLAGSHIP_GOALS,
      hfRepoId: 'LiquidAI/LFM2.5-1.2B-Base-GGUF',
    },
    {
      displayName: 'LFM2.5 1.2B Instruct',
      filePrefix: 'LFM2.5-1.2B-Instruct',
      goals: FLAGSHIP_GOALS,
      hfRepoId: 'LiquidAI/LFM2.5-1.2B-Instruct-GGUF',
    },
  ].flatMap((model) => buildPrefixedGgufEntries(model, LIQUIDAI_GGUF_QUANTS)),
];

const LARGE_FRONTIER_WISHLIST = [
  featuredMlx({
    ...EXTREME_MODEL_GOALS,
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'GLM 5.1',
    hfRepoId: 'mlx-community/GLM-5.1',
  }),
  featuredGguf({
    ...EXTREME_MODEL_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'GLM 5.1 (UD Q4_K_M)',
    hfFileName: 'GLM-5.1-UD-Q4_K_M.gguf',
    hfRepoId: 'unsloth/GLM-5.1-GGUF',
  }),
  featuredGguf({
    ...EXTREME_MODEL_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'GLM 5.1 (UD Q2_K_XL)',
    hfFileName: 'GLM-5.1-UD-Q2_K_XL.gguf',
    hfRepoId: 'unsloth/GLM-5.1-GGUF',
  }),
  featuredGguf({
    ...EXTREME_MODEL_GOALS,
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'GLM 5.1 (Q8_0)',
    hfFileName: 'GLM-5.1-Q8_0.gguf',
    hfRepoId: 'unsloth/GLM-5.1-GGUF',
  }),
];

// Keep the final list explicit by major model family so it stays easy to review.
export const FEATURED_WISHLIST = defineFeaturedWishlist([
  // -----------------------------------------------------------------------------
  // OpenAI
  // -----------------------------------------------------------------------------
  ...OPENAI_MLX_WISHLIST,

  // -----------------------------------------------------------------------------
  // Google DeepMind
  // -----------------------------------------------------------------------------
  ...GEMMA4_MLX_WISHLIST,
  ...GEMMA4_UNSLOTH_GGUF_WISHLIST,

  // -----------------------------------------------------------------------------
  // Alibaba / Qwen
  // -----------------------------------------------------------------------------
  ...QWEN35_MLX_WISHLIST,
  ...QWEN35_UNSLOTH_GGUF_WISHLIST,

  // -----------------------------------------------------------------------------
  // Liquid AI
  // -----------------------------------------------------------------------------
  ...LIQUIDAI_GGUF_WISHLIST,

  // -----------------------------------------------------------------------------
  // Frontier / Large
  // -----------------------------------------------------------------------------
  ...LARGE_FRONTIER_WISHLIST,

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
