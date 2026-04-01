import { MODEL_CATALOG } from '@whatcanirun/shared';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(MODEL_CATALOG, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
