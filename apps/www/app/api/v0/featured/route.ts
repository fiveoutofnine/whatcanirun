import { FEATURED_RUNTIMES, isFeaturedRuntime } from '@whatcanirun/shared';
import { unstable_cache as cache } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { getFeaturedModels } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_LIMIT = 50;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
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
  const osName = searchParams.get('osName')?.trim() || undefined;
  const limit = parsePositiveInt(searchParams.get('limit'));
  const clampedLimit = limit ? Math.min(limit, MAX_LIMIT) : undefined;

  const featured = await cache(
    () =>
      getFeaturedModels({
        ...(runtime ? { runtime } : {}),
        ...(cpu ? { cpu } : {}),
        ...(gpu ? { gpu } : {}),
        ...(gpuCount ? { gpuCount } : {}),
        ...(osName ? { osName } : {}),
        ...(clampedLimit ? { limit: clampedLimit } : {}),
      }),
    [
      'featured-models',
      runtime ?? 'all',
      cpu ?? '',
      gpu ?? '',
      String(gpuCount ?? ''),
      osName ?? '',
      String(clampedLimit ?? ''),
      FEATURED_RUNTIMES.join(','),
    ],
    { revalidate: 300 },
  )();

  return NextResponse.json(featured, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  });
}
