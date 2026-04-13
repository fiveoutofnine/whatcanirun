import { unstable_cache as cache } from 'next/cache';

import DeviceSizeCharts from './(components)/size-charts';
import { and, countDistinct, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { devices, runs, RunStatus, view__model_stats_by_device } from '@/lib/db/schema';

import DeviceFloatingSelector from '@/components/common/device-floating-selector';
import type { ChipOption } from '@/components/common/device-floating-selector';
import { H2 } from '@/components/templates/mdx';
import Vocab, { GLOSSARY } from '@/components/templates/vocab';

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
          modelCount: countDistinct(v.modelGroupKey).as('model_count'),
        })
        .from(v)
        .groupBy(v.deviceChipId),
    ['device-chip-options'],
    { revalidate: 600 },
  )();

  const chipIds = new Set(chipRows.map((r) => r.chipId));
  const sorted = [...chipRows].sort((a, b) => b.modelCount - a.modelCount);
  const validDevice = device !== undefined && chipIds.has(device);
  const effectiveDevice = device && validDevice ? device : (sorted[0]?.chipId ?? FALLBACK_DEVICE);

  // All model stats + overview for the selected device.
  const [data, overview] = await cache(
    async () => {
      const [rows, [aggRow], [contribRow]] = await Promise.all([
        db
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
          .where(eq(v.deviceChipId, sql`${effectiveDevice}`)),
        db
          .select({
            models: countDistinct(v.modelGroupKey),
            runs: sql<number>`SUM(${v.runCount})`.as('total_runs'),
            trials: sql<number>`SUM(${v.trialCount})`.as('total_trials'),
          })
          .from(v)
          .where(eq(v.deviceChipId, sql`${effectiveDevice}`)),
        db
          .select({ contributors: countDistinct(runs.ipHash) })
          .from(runs)
          .innerJoin(devices, eq(runs.deviceId, devices.id))
          .where(
            and(eq(devices.chipId, sql`${effectiveDevice}`), eq(runs.status, RunStatus.VERIFIED)),
          ),
      ]);

      const filtered = rows.filter(
        (r) =>
          r.modelFileSizeBytes != null &&
          r.modelFileSizeBytes > 0 &&
          r.avgDecodeTps > 0 &&
          r.avgPrefillTps > 0,
      );

      const totalTrials = Number(aggRow?.trials ?? 0);
      const totalTokens = totalTrials * (4096 + 1024);

      const overview: { label: string; term?: keyof typeof GLOSSARY; value: string }[] = [
        { label: 'Models tested', value: (aggRow?.models ?? 0).toLocaleString() },
        { label: 'Tokens', value: totalTokens.toLocaleString() },
        {
          label: 'Runs',
          term: 'run',
          value: Number(aggRow?.runs ?? 0).toLocaleString(),
        },
        {
          label: 'Contributors',
          term: 'contributors',
          value: (contribRow?.contributors ?? 0).toLocaleString(),
        },
      ];

      return [filtered, overview] as const;
    },
    [`device-chart-data-${effectiveDevice}`],
    { revalidate: 600 },
  )();

  return (
    <div className="flex grow flex-col py-4 md:py-6">
      <div
        className="hide-scrollbar scroll-overflow-indicators mx-auto flex w-full max-w-[83rem] snap-x scroll-px-4 gap-2 overflow-x-scroll px-4 md:scroll-px-6 md:px-6"
        tabIndex={-1}
      >
        {overview.map(({ label, term, value }, i) => (
          <div
            key={i}
            className="flex w-full min-w-48 snap-start flex-col rounded-xl border border-gray-6 bg-gray-2 p-4"
          >
            <h2 className="mb-1 text-sm font-medium leading-[1.125rem] text-gray-11">
              {term ? <Vocab word={term}>{label}</Vocab> : label}
            </h2>
            <span className="line-clamp-1 text-xl font-medium leading-6 text-gray-12">
              <span className="tabular-nums">{value}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="w-full md:px-6">
        <div className="mx-auto mt-4 flex w-full max-w-7xl grow flex-col md:mt-8">
          <H2 className="mb-1 px-4 md:px-0">Model Speeds</H2>
          <p className="mb-4 px-4 text-sm tabular-nums leading-normal text-gray-11 md:px-0 md:text-base">
            Results include trials with <span className="tabular-nums">4,096</span> input tokens and{' '}
            <span className="tabular-nums">1,024</span> output tokens only.
          </p>
          <DeviceSizeCharts data={data} />
        </div>
      </div>
      <DeviceFloatingSelector chips={chipRows} />
    </div>
  );
}
