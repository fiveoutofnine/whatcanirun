import { unstable_cache as cache } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import {
  getRankedModelFamilies,
  getRankedModelFamiliesCount,
} from '@/lib/queries/model-families-ranked';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  const q = searchParams.get('q')?.trim() || undefined;
  const orgSlug = searchParams.get('orgSlug')?.trim() || undefined;

  const [data, total] = await Promise.all([
    cache(
      () => getRankedModelFamilies(offset, limit, q, orgSlug),
      [`model-families-ranked-${offset}-${limit}-${q ?? ''}-${orgSlug ?? ''}`],
      { revalidate: 600 },
    )(),
    cache(
      () => getRankedModelFamiliesCount(q, orgSlug),
      [`model-families-ranked-total-${q ?? ''}-${orgSlug ?? ''}`],
      { revalidate: 600 },
    )(),
  ]);

  return NextResponse.json({ data, total, offset, limit });
}
