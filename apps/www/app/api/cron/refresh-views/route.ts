import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { view__model_stats_by_device } from '@/lib/db/schema';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.refreshMaterializedView(view__model_stats_by_device);

  return NextResponse.json({ ok: true });
}
