import { unstable_cache as cache } from 'next/cache';

import SizeCharts from './(components)/size-charts';
import type { SizeChartValue } from './(components)/size-charts';
import { countDistinct, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { view__model_stats_by_device } from '@/lib/db/schema';

import DeviceFloatingSelector from '@/app/(app)/[orgSlug]/[modelSlug]/(components)/device-floating-selector';
import type { ChipOption } from '@/app/(app)/[orgSlug]/[modelSlug]/(components)/device-floating-selector';
import { H2 } from '@/components/templates/mdx';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const FALLBACK_DEVICE = 'Apple M1 Max:10:Apple M1 Max:32:64';

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ device?: string }>;
}) {
  const { device } = await searchParams;

  // Chip options (reuse same pattern as home page).
  const v = view__model_stats_by_device;
  const chipRows: ChipOption[] = await cache(
    async () =>
      await db
        .select({
          chipId: v.deviceChipId,
          cpu: sql<string>`MIN(${v.deviceCpu})`.as('cpu'),
          cpuCores: sql<number>`MIN(${v.deviceCpuCores})`.as('cpu_cores'),
          gpu: sql<string>`MIN(${v.deviceGpu})`.as('gpu'),
          gpuCores: sql<number>`MIN(${v.deviceGpuCores})`.as('gpu_cores'),
          gpuCount: sql<number>`MIN(${v.deviceGpuCount})`.as('gpu_count'),
          ramGb: sql<number>`MIN(${v.deviceRamGb})`.as('ram_gb'),
          modelCount: countDistinct(v.modelId).as('model_count'),
        })
        .from(v)
        .groupBy(v.deviceChipId),
    ['size-chip-options'],
    { revalidate: 600 },
  )();

  const chipIds = new Set(chipRows.map((r) => r.chipId));
  const sorted = [...chipRows].sort((a, b) => b.modelCount - a.modelCount);
  const validDevice = device !== undefined && chipIds.has(device);
  const effectiveDevice = device && validDevice ? device : (sorted[0]?.chipId ?? FALLBACK_DEVICE);

  // All model stats for the selected device.
  const data: SizeChartValue[] = await cache(
    async () =>
      (
        await db
          .select({
            modelId: v.modelId,
            modelDisplayName: v.modelDisplayName,
            modelFormat: v.modelFormat,
            modelFileSizeBytes: v.modelFileSizeBytes,
            modelQuant: v.modelQuant,
            labName: v.labName,
            labLogoUrl: v.labLogoUrl,
            labSlug: v.labSlug,
            avgDecodeTps: v.avgDecodeTps,
            avgPrefillTps: v.avgPrefillTps,
          })
          .from(v)
          .where(eq(v.deviceChipId, sql`${effectiveDevice}`))
      ).filter(
        (r) =>
          r.modelFileSizeBytes != null &&
          r.modelFileSizeBytes > 0 &&
          r.avgDecodeTps > 0 &&
          r.avgPrefillTps > 0,
      ),
    [`size-chart-data-${effectiveDevice}`],
    { revalidate: 600 },
  )();

  return (
    <div className="flex grow md:px-6">
      <div className="mx-auto flex w-full max-w-7xl grow flex-col py-4 md:py-6">
        <H2 className="mb-1 px-4 md:px-0">Speed vs. Model Size</H2>
        <p className="mb-2 px-4 text-sm tabular-nums leading-normal text-gray-11 md:px-0 md:text-base">
          Results include trials with <span className="tabular-nums">4,096</span> input tokens and{' '}
          <span className="tabular-nums">1,024</span> output tokens only.
        </p>
        <SizeCharts data={data} />
      </div>
      <DeviceFloatingSelector chips={chipRows} />
    </div>
  );
}
