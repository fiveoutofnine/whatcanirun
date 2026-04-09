import { notFound } from 'next/navigation';

import TrialsDataTable from './(components)/trials-data-table';
import CopyRunIdButton from './copy-run-id-button';
import { asc, eq } from 'drizzle-orm';
import { ChevronRight } from 'lucide-react';

import { db } from '@/lib/db';
import {
  devices,
  modelFamilies,
  models,
  modelsInfo,
  organizations,
  rewards,
  runs,
  RunStatus,
  trials,
} from '@/lib/db/schema';
import { formatBytes } from '@/lib/utils';

import PreservedDeviceLink from '@/components/common/preserved-device-link';
import ContainerLayout from '@/components/layouts/container';
import { H2 } from '@/components/templates/mdx';
import RelativeDate from '@/components/templates/relative-date';
import { Badge, Button, CodeBlock } from '@/components/ui';

const STATUS_BADGE_INTENT = {
  [RunStatus.VERIFIED]: 'success',
  [RunStatus.PENDING]: 'warning',
  [RunStatus.FLAGGED]: 'orange',
  [RunStatus.REJECTED]: 'fail',
} as const;

type TrialRow = typeof trials.$inferSelect;

type RewardRow = typeof rewards.$inferSelect | undefined;

type RunPageValue = typeof runs.$inferSelect & {
  device: typeof devices.$inferSelect;
  model: typeof models.$inferSelect & {
    info:
      | (typeof modelsInfo.$inferSelect & {
          family: typeof modelFamilies.$inferSelect | null;
          lab: typeof organizations.$inferSelect | null;
        })
      | null;
  };
};

export default async function Page({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  const [run, trialRows, reward] = await Promise.all([
    db.query.runs.findFirst({
      where: eq(runs.id, runId),
      with: {
        model: {
          with: {
            info: {
              with: {
                family: true,
                lab: true,
              },
            },
          },
        },
        device: true,
      },
    }),
    db.query.trials.findMany({
      where: eq(trials.runId, runId),
      orderBy: asc(trials.trialIndex),
    }),
    db.query.rewards.findFirst({
      where: eq(rewards.runId, runId),
    }),
  ]);

  if (!run) return notFound();

  const modelInfo = run.model.info;
  const modelFamilyHref =
    modelInfo?.lab?.slug && modelInfo.family?.slug
      ? `/${modelInfo.lab.slug}/${modelInfo.family.slug}`
      : undefined;
  const deviceHref = `/device?device=${encodeURIComponent(run.device.chipId)}`;

  const inputTokenSummary = summarizeTrialTokens(trialRows, 'inputTokens');
  const outputTokenSummary = summarizeTrialTokens(trialRows, 'outputTokens');
  const metadataJson = JSON.stringify(buildMetadata(run, trialRows, reward), null, 2);
  const trialTableData = trialRows.map((trial) => ({ ...trial, deviceRamGb: run.device.ramGb }));

  return (
    <ContainerLayout className="flex flex-col">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-11">
        <PreservedDeviceLink className="transition-colors hover:text-gray-12" href="/runs">
          Runs
        </PreservedDeviceLink>
        <ChevronRight className="size-4" />
        <span className="line-clamp-1 font-mono text-xs text-gray-12 md:text-sm">{run.id}</span>
      </div>

      <section className="rounded-xl border border-gray-6 bg-gray-2 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="line-clamp-2 text-2xl font-medium tracking-tight text-gray-12 md:text-3xl">
                {modelInfo?.name || run.model.displayName}
              </h1>
              <div className="shrink-0 md:hidden">
                <StatusBadge status={run.status} />
              </div>
            </div>
            <p className="mt-1 text-sm leading-normal text-gray-11 md:text-base">
              {run.runtimeName} {run.runtimeVersion} • {run.device.cpu} •{' '}
              {Number(run.device.ramGb).toLocaleString()} GB • {run.device.osName}{' '}
              {run.device.osVersion}
            </p>
            <p className="mt-1 text-sm leading-normal text-gray-11 md:text-base">
              Harness {run.harnessVersion} • git {run.harnessGitSha}
              {run.runtimeBuildFlags ? ` • ${run.runtimeBuildFlags}` : ''}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                intent="none"
                href={modelFamilyHref}
                disabled={!modelFamilyHref}
              >
                View Model Family
              </Button>
              <Button size="sm" variant="outline" intent="none" href={deviceHref}>
                View Device
              </Button>
              <Button size="sm" variant="outline" intent="none" href="/runs">
                All Runs
              </Button>
              <CopyRunIdButton runId={run.id} />
            </div>
          </div>

          <div className="hidden shrink-0 md:flex md:flex-col md:items-end md:gap-3">
            <StatusBadge status={run.status} />
            <RelativeDate className="shrink-0" date={run.createdAt} type="relative" />
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <RelativeDate date={run.createdAt} type="relative" />
        </div>
      </section>

      {run.notes ? (
        <section className="mt-4 rounded-xl border border-gray-6 bg-gray-2 p-4 md:p-6">
          <h2 className="text-sm font-medium leading-5 text-gray-12 md:text-base">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-normal text-gray-11 md:text-base">
            {run.notes}
          </p>
        </section>
      ) : null}

      <section className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        <MetricCard label="Prompt tokens" value={formatMetricValue(inputTokenSummary)} />
        <MetricCard label="Generation tokens" value={formatMetricValue(outputTokenSummary)} />
        <MetricCard
          label="Trials"
          value={`${run.trialsPassed.toLocaleString()} / ${run.trialsTotal.toLocaleString()} passed`}
        />
        <MetricCard label="Decode" value={`${formatNumber(run.decodeTpsMean)} tok/s`} />
        <MetricCard
          label="Prefill"
          value={run.prefillTpsMean != null ? `${formatNumber(run.prefillTpsMean)} tok/s` : '—'}
        />
        <MetricCard
          label="Peak memory"
          value={`${formatGb(run.peakRssMb)} GB (${formatPercent(run.peakRssMb / 1024 / run.device.ramGb)})`}
        />
      </section>

      <section className="mt-8">
        <H2 className="mb-3">Technical Metadata</H2>
        <CodeBlock
          className="-mx-4 w-[calc(100%+2rem)] rounded-none border-x-0 md:mx-0 md:w-full md:rounded-xl md:border-x [&_[code-block-header]]:rounded-none md:[&_[code-block-header]]:rounded-t-xl [&_[code-block-pre]]:max-h-80 [&_[code-block-pre]]:overflow-y-auto [&_[code-block-pre]]:rounded-none md:[&_[code-block-pre]]:rounded-b-[0.6875rem]"
          fileName="metadata.json"
          language="none"
          showLineNumbers={false}
        >
          {metadataJson}
        </CodeBlock>
      </section>

      <section className="mt-8">
        <H2 className="mb-3">Trials</H2>
        <TrialsDataTable data={trialTableData} />
      </section>
    </ContainerLayout>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge variant="outline" size="sm" type="text" intent={STATUS_BADGE_INTENT[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-6 bg-gray-2 p-4">
      <h2 className="text-sm font-medium leading-[1.125rem] text-gray-11">{label}</h2>
      <span className="mt-1 block text-lg font-medium leading-6 text-gray-12 md:text-xl">
        {value}
      </span>
    </div>
  );
}

function summarizeTrialTokens(trialRows: TrialRow[], key: 'inputTokens' | 'outputTokens') {
  if (trialRows.length === 0) return null;

  const values = trialRows.map((trial) => trial[key]);
  const first = values[0];
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (values.every((value) => value === first)) {
    return { kind: 'uniform' as const, value: first };
  }

  return { kind: 'range' as const, min, max };
}

function formatMetricValue(
  summary:
    | {
        kind: 'uniform';
        value: number;
      }
    | {
        kind: 'range';
        min: number;
        max: number;
      }
    | null,
) {
  if (!summary) return '—';
  if (summary.kind === 'uniform') return summary.value.toLocaleString();
  return `${summary.min.toLocaleString()}-${summary.max.toLocaleString()}`;
}

function formatNumber(value: number, fractionDigits = 1) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatGb(mb: number) {
  return formatNumber(mb / 1024, 2);
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100, 1)}%`;
}

function buildMetadata(run: RunPageValue, trialRows: TrialRow[], reward: RewardRow) {
  const inputTokenSummary = summarizeTrialTokens(trialRows, 'inputTokens');
  const outputTokenSummary = summarizeTrialTokens(trialRows, 'outputTokens');

  const technicalMetadata = {
    runId: run.id,
    status: run.status,
    createdAt: run.createdAt,
    bundleId: run.bundleId,
    bundleSha256: run.bundleSha256,
    schemaVersion: run.schemaVersion,
    contextLength: run.contextLength,
    tokenShape: {
      inputTokens:
        inputTokenSummary?.kind === 'uniform'
          ? inputTokenSummary.value
          : inputTokenSummary
            ? { min: inputTokenSummary.min, max: inputTokenSummary.max }
            : null,
      outputTokens:
        outputTokenSummary?.kind === 'uniform'
          ? outputTokenSummary.value
          : outputTokenSummary
            ? { min: outputTokenSummary.min, max: outputTokenSummary.max }
            : null,
      trialCount: trialRows.length,
    },
    model: {
      displayName: run.model.info?.name || run.model.displayName,
      quant: run.model.info?.quant || run.model.quant,
      format: run.model.format,
      source: run.model.info?.source || run.model.source,
      fileSize: run.model.info?.fileSizeBytes || run.model.fileSizeBytes || null,
      fileSizeFormatted:
        run.model.info?.fileSizeBytes || run.model.fileSizeBytes
          ? formatBytes((run.model.info?.fileSizeBytes || run.model.fileSizeBytes)!)
          : null,
    },
    device: {
      chipId: run.device.chipId,
      cpu: run.device.cpu,
      cpuCores: run.device.cpuCores,
      gpu: run.device.gpu,
      gpuCores: run.device.gpuCores,
      gpuCount: run.device.gpuCount,
      ramGb: run.device.ramGb,
      osName: run.device.osName,
      osVersion: run.device.osVersion,
    },
    runtime: {
      name: run.runtimeName,
      version: run.runtimeVersion,
      buildFlags: run.runtimeBuildFlags,
    },
    harness: {
      version: run.harnessVersion,
      gitSha: run.harnessGitSha,
    },
    ...(run.did
      ? {
          did: run.did,
          reward: reward
            ? {
                status: 'granted',
                modelReward: reward.modelReward,
                deviceReward: reward.deviceReward,
                totalReward: reward.totalReward,
                paymentRef: reward.paymentRef,
              }
            : {
                status:
                  run.status === RunStatus.PENDING
                    ? 'pending_until_verification'
                    : run.status === RunStatus.VERIFIED
                      ? 'not_recorded'
                      : 'not_eligible',
              },
        }
      : {}),
  };

  return technicalMetadata;
}
