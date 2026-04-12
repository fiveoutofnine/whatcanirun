import { describe, expect, test } from 'bun:test';
import {
  apple,
  defineFeaturedWishlist,
  featuredGguf,
  featuredMlx,
  gpu,
  normalizeFeaturedDeviceTarget,
} from '@whatcanirun/shared';

import {
  buildFeaturedCoverageMap,
  selectFeaturedWishlistEntries,
} from '../../../www/lib/utils/featured-models.ts';

describe('normalizeFeaturedDeviceTarget', () => {
  test('buckets Apple Silicon chips by marketed tier', () => {
    expect(
      normalizeFeaturedDeviceTarget({
        cpu: 'Apple M5 Max',
        gpu: 'Apple M5 Max',
        gpuCount: 1,
        osName: 'macOS',
      }),
    ).toBe(apple('M5 Max'));

    expect(
      normalizeFeaturedDeviceTarget({
        cpu: 'Apple M5 Pro',
        gpu: 'Apple M5 Pro',
        gpuCount: 1,
        osName: 'macOS',
      }),
    ).toBe(apple('M5 Pro'));

    expect(
      normalizeFeaturedDeviceTarget({
        cpu: 'Apple M3 Ultra',
        gpu: 'Apple M3 Ultra',
        gpuCount: 1,
        osName: 'macOS',
      }),
    ).toBe(apple('M3 Ultra'));

    expect(
      normalizeFeaturedDeviceTarget({
        cpu: 'Apple M1',
        gpu: 'Apple M1',
        gpuCount: 1,
        osName: 'macOS',
      }),
    ).toBe(apple('M1'));
  });

  test('treats single and multi-GPU setups as the same non-Apple target', () => {
    const single = normalizeFeaturedDeviceTarget({
      cpu: 'AMD Ryzen 9 9950X',
      gpu: 'NVIDIA GeForce RTX 5090',
      gpuCount: 1,
      osName: 'Linux',
    });
    const multi = normalizeFeaturedDeviceTarget({
      cpu: 'AMD Ryzen 9 9950X',
      gpu: 'NVIDIA GeForce RTX 5090',
      gpuCount: 2,
      osName: 'Linux',
    });

    expect(single).toBe(gpu('GeForce RTX 5090'));
    expect(multi).toBe(gpu('GeForce RTX 5090'));
  });

  test('keeps laptop GPU variants distinct from desktop parts', () => {
    expect(
      normalizeFeaturedDeviceTarget({
        cpu: 'Intel Core Ultra 9 275HX',
        gpu: 'NVIDIA GeForce RTX 5090 Laptop GPU',
        gpuCount: 1,
        osName: 'Windows',
      }),
    ).toBe(gpu('GeForce RTX 5090 Laptop GPU'));
  });
});

describe('selectFeaturedWishlistEntries', () => {
  test('orders by verified coverage, respects runtime, and keys GGUF coverage by repo:file', () => {
    const wishlist = defineFeaturedWishlist([
      featuredGguf('Lower coverage GGUF', 'org/model-a', 'model-a.gguf', [
        gpu('GeForce RTX 5090'),
        apple('M1'),
      ]),
      featuredGguf('Higher coverage GGUF', 'org/model-b', 'model-b.gguf', [
        gpu('GeForce RTX 5090'),
        apple('M1'),
      ]),
      featuredMlx('Different runtime', 'org/model-c', [apple('M1')]),
    ]);
    const coverage = buildFeaturedCoverageMap([
      {
        runtime: 'llama.cpp',
        modelRef: 'org/model-a:model-a.gguf',
        cpu: 'AMD Ryzen 9 9950X',
        gpu: 'NVIDIA GeForce RTX 5090',
        gpuCount: 2,
        osName: 'Linux',
        runCount: 1,
      },
      {
        runtime: 'llama.cpp',
        modelRef: 'org/model-a:model-a.gguf',
        cpu: 'Apple M1',
        gpu: 'Apple M1',
        gpuCount: 1,
        osName: 'macOS',
        runCount: 2,
      },
      {
        runtime: 'llama.cpp',
        modelRef: 'org/model-b:model-b.gguf',
        cpu: 'AMD Ryzen 9 9950X',
        gpu: 'NVIDIA GeForce RTX 5090',
        gpuCount: 1,
        osName: 'Linux',
        runCount: 5,
      },
      {
        runtime: 'llama.cpp',
        modelRef: 'org/model-b:model-b.gguf',
        cpu: 'Apple M1',
        gpu: 'Apple M1',
        gpuCount: 1,
        osName: 'macOS',
        runCount: 7,
      },
      {
        runtime: 'mlx_lm',
        modelRef: 'org/model-c',
        cpu: 'Apple M1',
        gpu: 'Apple M1',
        gpuCount: 1,
        osName: 'macOS',
        runCount: 9,
      },
    ]);

    const targeted = selectFeaturedWishlistEntries({
      coverage,
      deviceTarget: gpu('GeForce RTX 5090'),
      runtime: 'llama.cpp',
      wishlist,
    });

    expect(targeted.map((entry) => entry.modelRef)).toEqual([
      'org/model-a:model-a.gguf',
      'org/model-b:model-b.gguf',
    ]);

    const runtimeOnlyFallback = selectFeaturedWishlistEntries({
      coverage,
      deviceTarget: gpu('GeForce RTX 4090'),
      runtime: 'llama.cpp',
      wishlist,
    });

    expect(runtimeOnlyFallback.map((entry) => entry.modelRef)).toEqual([
      'org/model-a:model-a.gguf',
      'org/model-b:model-b.gguf',
    ]);
    expect(runtimeOnlyFallback.every((entry) => entry.runtime === 'llama.cpp')).toBe(true);
  });
});
