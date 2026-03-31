import { NextRequest, NextResponse } from 'next/server';

import { and, eq, ne, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { devices } from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// GET — Backfill chip_id for non-macOS devices
// -----------------------------------------------------------------------------
// Temporary route. For non-macOS rows:
//   - gpu_cores > 0 → chip_id = GPU name
//   - gpu_cores = 0 → chip_id = CPU name

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: devices.id,
      cpu: devices.cpu,
      gpu: devices.gpu,
      gpuCores: devices.gpuCores,
      chipId: devices.chipId,
    })
    .from(devices)
    .where(ne(sql`LOWER(${devices.osName})`, 'macos'));

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const newChipId = row.gpuCores > 0 ? row.gpu : row.cpu;

    if (row.chipId === newChipId) {
      skipped++;
      continue;
    }

    await db.update(devices).set({ chipId: newChipId }).where(eq(devices.id, row.id));
    updated++;
  }

  return NextResponse.json({
    total: rows.length,
    updated,
    skipped,
  });
}
