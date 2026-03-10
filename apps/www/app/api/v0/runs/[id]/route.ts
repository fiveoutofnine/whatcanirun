import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { runs } from '@/lib/db/schema';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await db.query.runs.findFirst({
    where: eq(runs.id, id),
    with: { device: true, model: true },
  });

  if (!result) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
