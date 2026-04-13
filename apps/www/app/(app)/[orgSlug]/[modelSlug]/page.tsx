import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import DevicesChart from './(components)/devices-chart';
import type { ModelDevicesChartValue } from './(components)/devices-chart';
import ModelQuantizationsTable from './(components)/quantizations-table';
import type { Quant } from './(components)/quantizations-table';
import { getModelFamily, getModelFamilyChips, groupModelFamilyMembers } from './utils';
import { eq } from 'drizzle-orm';
import { File } from 'lucide-react';

import { db } from '@/lib/db';
import { modelsInfo, view__model_device_summary } from '@/lib/db/schema';

import DeviceFloatingSelector from '@/components/common/device-floating-selector';
import { H2 } from '@/components/templates/mdx';
import StateInfo from '@/components/templates/state-info';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; modelSlug: string }>;
  searchParams: Promise<{ device?: string }>;
}) {
  const { orgSlug, modelSlug } = await params;
  const { device: deviceParam } = await searchParams;
  const rootPath = `/${orgSlug}/${modelSlug}`;

  // We handle the not found case in the layout.
  const family = await getModelFamily(orgSlug, modelSlug);
  if (!family) return notFound();
  const { members, stats } = await cache(
    async () => {
      const [members, stats] = await Promise.all([
        db.query.modelsInfo.findMany({
          where: eq(modelsInfo.familyId, family.familyId),
          with: { model: true, quantizedBy: true },
        }),
        db
          .select()
          .from(view__model_device_summary)
          .where(eq(view__model_device_summary.familyId, family.familyId)),
      ]);

      return { members, stats };
    },
    ['model-family-data', family.familyId],
    { revalidate: 600 },
  )();

  if (members.length === 0 || stats.length === 0) {
    return (
      <div className="flex grow flex-col p-4 md:px-0 md:py-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-xl border border-gray-6 bg-gray-2 px-4 py-12">
          <StateInfo
            size="sm"
            title="No benchmark results found"
            description="No benchmark results yet for this model family."
            icon={<File />}
          />
        </div>
      </div>
    );
  }

  // Effective device.
  const chips = await getModelFamilyChips(family.familyId);
  const chipIds = new Set(chips.map((c) => c.chipId));
  const sortedChips = [...chips].sort((a, b) => b.modelCount - a.modelCount);
  const effectiveDevice =
    deviceParam !== undefined && chipIds.has(deviceParam)
      ? deviceParam
      : (sortedChips[0]?.chipId ?? '');

  const groupedMembers = groupModelFamilyMembers(members);

  // Stats by grouped model for device (one row per grouped model from the view)
  const statsByModel = new Map(
    stats.filter((r) => r.deviceChipId === effectiveDevice).map((r) => [r.modelGroupKey, r]),
  );

  // Quantizations
  const quants: Quant[] = groupedMembers
    .map(({ modelGroupKey, member }) => {
      if (!member.model) return null;

      return {
        modelGroupKey,
        modelId: member.model.id,
        quant: member.quant || member.model.quant,
        format: member.model.format,
        fileSizeBytes: member.fileSizeBytes || member.model.fileSizeBytes || null,
        source: member.source || member.model.source,
        quantizedBy: member.quantizedBy,
        score: statsByModel.get(modelGroupKey)?.compositeScore ?? null,
        decodeTps: statsByModel.get(modelGroupKey)?.avgDecodeTps ?? null,
        prefillTps: statsByModel.get(modelGroupKey)?.avgPrefillTps ?? null,
      };
    })
    .filter((quant): quant is Quant => quant !== null)
    .sort((a, b) => {
      if (a.fileSizeBytes == null && b.fileSizeBytes == null) return 0;
      if (a.fileSizeBytes == null) return 1;
      if (b.fileSizeBytes == null) return -1;
      return a.fileSizeBytes - b.fileSizeBytes;
    });

  // Chart data: all model×device combos across all chips
  const modelInfoMap = new Map(
    groupedMembers
      .filter(({ member }) => member.model !== null)
      .map(({ modelGroupKey, member }) => [
        modelGroupKey,
        {
          quant: member.quant || member.model!.quant,
          format: member.model!.format,
          fileSizeBytes: member.fileSizeBytes || member.model!.fileSizeBytes || null,
        },
      ]),
  );
  const devicesChartData: ModelDevicesChartValue[] = stats
    .filter(
      (r) =>
        r.avgDecodeTps != null &&
        r.avgPrefillTps != null &&
        modelInfoMap.has(r.modelGroupKey) &&
        modelInfoMap.get(r.modelGroupKey)!.quant != null,
    )
    .map((r) => {
      const info = modelInfoMap.get(r.modelGroupKey)!;
      return {
        ...r,
        quant: info.quant!,
        format: info.format,
        fileSizeBytes: info.fileSizeBytes,
      };
    });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Fragment>
      <div
        id={`content-${rootPath}`}
        className="flex grow md:px-6"
        role="tabpanel"
        aria-labelledby={`trigger-${rootPath}`}
      >
        <div className="mx-auto flex w-full max-w-5xl grow flex-col py-4 md:py-6">
          <H2 className="mb-2 px-4 md:px-0">Quantizations</H2>
          <ModelQuantizationsTable quants={quants} />
          {devicesChartData.length > 0 ? (
            <Fragment>
              <H2 className="mb-1 mt-4 px-4 md:mt-8 md:px-0">Device Comparison</H2>
              <p className="mb-4 px-4 text-sm tabular-nums leading-normal text-gray-11 md:px-0 md:text-base">
                Results include trials with <span className="tabular-nums">4,096</span> input tokens
                and <span className="tabular-nums">1,024</span> output tokens only.
              </p>
              <DevicesChart data={devicesChartData} defaultDevice={effectiveDevice} />
            </Fragment>
          ) : null}
        </div>
      </div>
      <DeviceFloatingSelector chips={chips} />
    </Fragment>
  );
}
