import { describe, expect, test } from 'bun:test';

import {
  buildFeaturedModelsUrl,
  fetchFeaturedModels,
  getFallbackFeaturedModels,
} from './client';

describe('buildFeaturedModelsUrl', () => {
  test('includes raw device params when available', () => {
    const url = new URL(
      buildFeaturedModelsUrl({
        device: {
          cpu: 'Apple M5 Max',
          gpu: 'Apple M5 Max',
          gpuCount: 1,
          osName: 'macOS',
        },
        limit: 4,
        runtime: 'mlx_lm',
      }),
    );

    expect(url.pathname).toBe('/api/v0/featured');
    expect(url.searchParams.get('runtime')).toBe('mlx_lm');
    expect(url.searchParams.get('cpu')).toBe('Apple M5 Max');
    expect(url.searchParams.get('gpu')).toBe('Apple M5 Max');
    expect(url.searchParams.get('gpuCount')).toBe('1');
    expect(url.searchParams.get('osName')).toBe('macOS');
    expect(url.searchParams.get('limit')).toBe('4');
  });
});

describe('getFallbackFeaturedModels', () => {
  test('filters by runtime and target, then falls back to runtime-only when target misses', () => {
    const targeted = getFallbackFeaturedModels({
      device: {
        cpu: 'Apple M5 Max',
        gpu: 'Apple M5 Max',
        gpuCount: 1,
        osName: 'macOS',
      },
      runtime: 'mlx_lm',
    });

    expect(targeted.length).toBeGreaterThan(0);
    expect(targeted.every((model) => model.runtime === 'mlx_lm')).toBe(true);

    const runtimeOnly = getFallbackFeaturedModels({
      device: {
        cpu: 'AMD Ryzen 9 9950X',
        gpu: 'NVIDIA GeForce RTX 4070',
        gpuCount: 1,
        osName: 'Linux',
      },
      runtime: 'mlx_lm',
    });

    expect(runtimeOnly.length).toBeGreaterThan(0);
    expect(runtimeOnly.every((model) => model.runtime === 'mlx_lm')).toBe(true);
  });
});

describe('fetchFeaturedModels', () => {
  test('falls back to the local wishlist when the API payload is invalid', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ invalid: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })) as typeof fetch;

    try {
      const fallback = getFallbackFeaturedModels({ runtime: 'llama.cpp' });
      const models = await fetchFeaturedModels({ runtime: 'llama.cpp' });

      expect(models).toEqual(fallback);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
