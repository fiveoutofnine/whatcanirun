import {
  apple,
  defineFeaturedWishlist,
  featuredGguf,
  featuredMlx,
  gpu,
} from './featured';

const APPLE_TARGETS = Object.freeze([
  apple('M1'),
  apple('M5 Pro'),
  apple('M5 Max'),
  apple('M3 Ultra'),
]);

const LLAMA_CPP_TARGETS = Object.freeze([
  ...APPLE_TARGETS,
  gpu('GeForce RTX 5090'),
  gpu('GeForce RTX 5090 Laptop GPU'),
  gpu('GeForce RTX 4090'),
]);

export const FEATURED_WISHLIST = defineFeaturedWishlist([
  featuredMlx('Gemma 4 E4B Instruct (4-bit)', 'mlx-community/gemma-4-e4b-it-4bit', APPLE_TARGETS),
  featuredMlx('Gemma 4 E4B Instruct (8-bit)', 'mlx-community/gemma-4-e4b-it-8bit', APPLE_TARGETS),
  featuredMlx('Gemma 4 31B Instruct (4-bit)', 'mlx-community/gemma-4-31b-it-4bit', APPLE_TARGETS),
  featuredGguf(
    'Gemma 4 E2B Instruct (Q4_K_M)',
    'unsloth/gemma-4-E2B-it-GGUF',
    'gemma-4-E2B-it-Q4_K_M.gguf',
    LLAMA_CPP_TARGETS,
  ),
  featuredGguf(
    'Gemma 4 E4B Instruct (Q4_K_M)',
    'unsloth/gemma-4-E4B-it-GGUF',
    'gemma-4-E4B-it-Q4_K_M.gguf',
    LLAMA_CPP_TARGETS,
  ),
  featuredGguf(
    'Gemma 4 26B-A4B Instruct (Q4_K_M)',
    'unsloth/gemma-4-26B-A4B-it-GGUF',
    'gemma-4-26B-A4B-it-UD-Q4_K_M.gguf',
    LLAMA_CPP_TARGETS,
  ),
  featuredGguf(
    'Gemma 4 31B Instruct (Q4_K_M)',
    'unsloth/gemma-4-31B-it-GGUF',
    'gemma-4-31B-it-Q4_K_M.gguf',
    LLAMA_CPP_TARGETS,
  ),
]);
