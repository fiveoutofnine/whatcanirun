import { NextResponse } from 'next/server';

import featured from './featured.json';

export async function GET() {
  return NextResponse.json(featured, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
