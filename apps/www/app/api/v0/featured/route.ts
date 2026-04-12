import { isFeaturedRuntime } from '@whatcanirun/shared';
import { unstable_cache as cache } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { getFeaturedModels, getFeaturedModelsCacheKey } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_LIMIT = 50;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function parsePositiveInt(value: string | null): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const runtimeParam = searchParams.get('runtime')?.trim();
  const runtime = isFeaturedRuntime(runtimeParam) ? runtimeParam : undefined;
  const cpu = searchParams.get('cpu')?.trim() || undefined;
  const gpu = searchParams.get('gpu')?.trim() || undefined;
  const gpuCount = parsePositiveInt(searchParams.get('gpuCount'));
  const ramGb = parsePositiveInt(searchParams.get('ramGb'));
  const osName = searchParams.get('osName')?.trim() || undefined;
  const limit = parsePositiveInt(searchParams.get('limit'));
  const clampedLimit = limit ? Math.min(limit, MAX_LIMIT) : undefined;
  const query = {
    ...(runtime ? { runtime } : {}),
    ...(cpu ? { cpu } : {}),
    ...(gpu ? { gpu } : {}),
    ...(gpuCount ? { gpuCount } : {}),
    ...(ramGb ? { ramGb } : {}),
    ...(osName ? { osName } : {}),
    ...(clampedLimit ? { limit: clampedLimit } : {}),
  };

  const featured = await cache(
    () => getFeaturedModels(query),
    getFeaturedModelsCacheKey(query),
    { revalidate: 300 },
  )();

  return NextResponse.json(featured, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  });
}
