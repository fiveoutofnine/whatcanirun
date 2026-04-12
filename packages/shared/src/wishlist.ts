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

export const FEATURED_WISHLIST = defineFeaturedWishlist([
  featuredMlx({
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Gemma 4 E4B Instruct (4-bit)',
    hfRepoId: 'mlx-community/gemma-4-e4b-it-4bit',
    minimumCompositeScore: 0.55,
  }),
  featuredMlx({
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Gemma 4 E4B Instruct (8-bit)',
    hfRepoId: 'mlx-community/gemma-4-e4b-it-8bit',
    minimumCompositeScore: 0.5,
  }),
  featuredMlx({
    deviceTypes: MLX_DEVICE_TYPES,
    displayName: 'Gemma 4 31B Instruct (4-bit)',
    hfRepoId: 'mlx-community/gemma-4-31b-it-4bit',
    minimumCompositeScore: 0.4,
  }),
  featuredGguf({
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 E2B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-E2B-it-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-E2B-it-GGUF',
    minimumCompositeScore: 0.55,
  }),
  featuredGguf({
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 E4B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-E4B-it-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-E4B-it-GGUF',
    minimumCompositeScore: 0.5,
  }),
  featuredGguf({
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 26B-A4B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-26B-A4B-it-UD-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-26B-A4B-it-GGUF',
    minimumCompositeScore: 0.4,
  }),
  featuredGguf({
    deviceTypes: LLAMA_CPP_DEVICE_TYPES,
    displayName: 'Gemma 4 31B Instruct (Q4_K_M)',
    hfFileName: 'gemma-4-31B-it-Q4_K_M.gguf',
    hfRepoId: 'unsloth/gemma-4-31B-it-GGUF',
    minimumCompositeScore: 0.35,
  }),
]);
