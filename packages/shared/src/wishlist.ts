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
  featuredMlx(
    'Gemma 4 E4B Instruct (4-bit)',
    'mlx-community/gemma-4-e4b-it-4bit',
    MLX_DEVICE_TYPES,
  ),
  featuredMlx(
    'Gemma 4 E4B Instruct (8-bit)',
    'mlx-community/gemma-4-e4b-it-8bit',
    MLX_DEVICE_TYPES,
  ),
  featuredMlx(
    'Gemma 4 31B Instruct (4-bit)',
    'mlx-community/gemma-4-31b-it-4bit',
    MLX_DEVICE_TYPES,
  ),
  featuredGguf(
    'Gemma 4 E2B Instruct (Q4_K_M)',
    'unsloth/gemma-4-E2B-it-GGUF',
    'gemma-4-E2B-it-Q4_K_M.gguf',
    LLAMA_CPP_DEVICE_TYPES,
  ),
  featuredGguf(
    'Gemma 4 E4B Instruct (Q4_K_M)',
    'unsloth/gemma-4-E4B-it-GGUF',
    'gemma-4-E4B-it-Q4_K_M.gguf',
    LLAMA_CPP_DEVICE_TYPES,
  ),
  featuredGguf(
    'Gemma 4 26B-A4B Instruct (Q4_K_M)',
    'unsloth/gemma-4-26B-A4B-it-GGUF',
    'gemma-4-26B-A4B-it-UD-Q4_K_M.gguf',
    LLAMA_CPP_DEVICE_TYPES,
  ),
  featuredGguf(
    'Gemma 4 31B Instruct (Q4_K_M)',
    'unsloth/gemma-4-31B-it-GGUF',
    'gemma-4-31B-it-Q4_K_M.gguf',
    LLAMA_CPP_DEVICE_TYPES,
  ),
]);
