import type { FeaturedDeviceInfo, FeaturedModel, FeaturedRuntime } from '@whatcanirun/shared';
import {
  FEATURED_WISHLIST,
  getFeaturedDeviceType,
  normalizeFeaturedDeviceTarget,
  toFeaturedModel,
} from '@whatcanirun/shared';

import { API_BASE } from '../rewards/network';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FeaturedModelsRequest {
  device?: FeaturedDeviceInfo;
  limit?: number;
  runtime?: FeaturedRuntime;
}

export interface FeaturedModelsResult {
  models: FeaturedModel[];
  source: 'api' | 'fallback';
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isFeaturedModel(item: unknown): item is FeaturedModel {
  if (typeof item !== 'object' || item === null) return false;

  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.displayName === 'string' &&
    typeof candidate.hfRepoId === 'string' &&
    (candidate.hfFileName === undefined || typeof candidate.hfFileName === 'string') &&
    (candidate.runtime === 'mlx_lm' || candidate.runtime === 'llama.cpp')
  );
}

export function buildFeaturedModelsUrl(request: FeaturedModelsRequest = {}): string {
  const url = new URL('/api/v0/featured', API_BASE);

  if (request.runtime) {
    url.searchParams.set('runtime', request.runtime);
  }

  if (request.device?.cpu) {
    url.searchParams.set('cpu', request.device.cpu);
  }

  if (request.device?.gpu) {
    url.searchParams.set('gpu', request.device.gpu);
  }

  if (request.device?.gpuCount != null) {
    url.searchParams.set('gpuCount', String(request.device.gpuCount));
  }

  if (request.device?.ramGb != null) {
    url.searchParams.set('ramGb', String(request.device.ramGb));
  }

  if (request.device?.osName) {
    url.searchParams.set('osName', request.device.osName);
  }

  if (request.limit != null) {
    url.searchParams.set('limit', String(request.limit));
  }

  return url.toString();
}

export function getFallbackFeaturedModels(request: FeaturedModelsRequest = {}): FeaturedModel[] {
  const runtimeEntries = request.runtime
    ? FEATURED_WISHLIST.filter((entry) => entry.runtime === request.runtime)
    : FEATURED_WISHLIST;
  const deviceTarget =
    request.device == null ? null : normalizeFeaturedDeviceTarget(request.device);
  const deviceType = deviceTarget ? getFeaturedDeviceType(deviceTarget) : null;
  const targetedEntries =
    deviceType == null
      ? []
      : runtimeEntries.filter((entry) => entry.deviceTypes.includes(deviceType));
  const entries = targetedEntries.length > 0 ? targetedEntries : runtimeEntries;

  return entries.map(toFeaturedModel);
}

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

export async function fetchFeaturedModels(
  request: FeaturedModelsRequest = {},
): Promise<FeaturedModelsResult> {
  const fallback = getFallbackFeaturedModels(request);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(buildFeaturedModelsUrl(request), {
        signal: controller.signal,
      });

      if (!response.ok) {
        return { models: fallback, source: 'fallback' };
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isFeaturedModel)) {
        return { models: fallback, source: 'fallback' };
      }

      return { models: data, source: 'api' };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return { models: fallback, source: 'fallback' };
  }
}
