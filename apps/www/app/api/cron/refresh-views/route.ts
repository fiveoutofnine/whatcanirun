import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { view__model_device_summary, view__model_stats_by_device } from '@/lib/db/schema';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await Promise.all([
    db.refreshMaterializedView(view__model_stats_by_device),
    db.refreshMaterializedView(view__model_device_summary),
  ]);

  return NextResponse.json({ ok: true });
}
