import { notFound } from 'next/navigation';

import TrialsDataTable from './(components)/trials-data-table';
import CopyBenchmarkCommandButton from './copy-benchmark-command-button';
import CopyRunIdButton from './copy-run-id-button';
import { asc, eq } from 'drizzle-orm';
import { ArrowUpRight, Calendar, FileQuestionMark, Hammer } from 'lucide-react';

import { MANUFACTURER_LABEL } from '@/lib/constants/gpu';
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
import { formatBytes, parseManufacturer } from '@/lib/utils';

import LogoImg from '@/components/common/logo-img';
import PreservedDeviceLink from '@/components/common/preserved-device-link';
import { H2 } from '@/components/templates/mdx';
import RelativeDate from '@/components/templates/relative-date';
import ScoreBadge from '@/components/templates/score-badge';
import UserAvatar from '@/components/templates/user-avatar';
import { Badge, CodeBlock } from '@/components/ui';

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
          quantizedBy: typeof organizations.$inferSelect | null;
        })
      | null;
  };
};

const INTERACTIVE_TEXT_CLASSNAME =
  'text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [run, trialRows, reward] = await Promise.all([
    db.query.runs.findFirst({
      where: eq(runs.id, id),
      with: {
        model: {
          with: {
            info: {
              with: {
                family: true,
                lab: true,
                quantizedBy: true,
              },
            },
          },
        },
        device: true,
      },
    }),
    db.query.trials.findMany({
      where: eq(trials.runId, id),
      orderBy: asc(trials.trialIndex),
    }),
    db.query.rewards.findFirst({
      where: eq(rewards.runId, id),
    }),
  ]);

  if (!run) return notFound();

  const modelInfo = run.model.info;
  const modelDisplayName = modelInfo?.name || run.model.displayName;
  const modelSource = modelInfo?.source || run.model.source;
  const primaryDeviceName = run.device.gpuCount > 0 ? run.device.gpu : run.device.cpu;
  const {
    displayName: deviceDisplayName,
    logo: ManufacturerLogo,
    manufacturer,
  } = parseManufacturer(primaryDeviceName);
  const modelHref =
    modelInfo?.lab?.slug && modelInfo.family?.slug
      ? `/${modelInfo.lab.slug}/${modelInfo.family.slug}`
      : modelInfo?.lab?.slug
        ? `/${modelInfo.lab.slug}`
        : getModelSourceHref(run.model.info?.source || run.model.source, run.runtimeName);
  const deviceHref = `/device?device=${encodeURIComponent(run.device.chipId)}`;
  const deviceCountPrefix =
    manufacturer !== 'apple' && run.device.gpuCount > 1 ? `${run.device.gpuCount}× ` : '';
  const deviceLabel = `${deviceCountPrefix}${deviceDisplayName} · ${run.device.ramGb.toLocaleString()} GB`;
  const benchmarkOnLabel = deviceCountPrefix
    ? 'benchmark on'
    : `benchmark on ${getIndefiniteArticle(deviceDisplayName)}`;
  const runtimePresentation = getRuntimePresentation(run.runtimeName);
  const RuntimeLogo = runtimePresentation.Icon;
  const harnessHref = `https://github.com/fiveoutofnine/whatcanirun/commit/${run.harnessGitSha}`;
  const benchmarkCommand = modelSource
    ? `bunx whatcanirun@latest run --model ${modelSource} --runtime ${run.runtimeName} --submit`
    : null;
  const runnabilityScore = computeRunnabilityScore(run);

  const inputTokenSummary = summarizeTrialTokens(trialRows, 'inputTokens');
  const outputTokenSummary = summarizeTrialTokens(trialRows, 'outputTokens');
  const metadataJson = JSON.stringify(buildMetadata(run, trialRows, reward), null, 2);
  const trialTableData = trialRows.map((trial) => ({ ...trial, deviceRamGb: run.device.ramGb }));

  return (
    <div className="flex grow flex-col">
      <header className="w-full border-b border-gray-6 bg-black px-4 py-4 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          <h1 className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-2xl font-normal leading-snug tracking-tight text-gray-11 md:text-3xl">
            {modelHref ? (
              isExternalHref(modelHref) ? (
                <a
                  className={`inline-flex max-w-full items-center gap-2 align-middle ${INTERACTIVE_TEXT_CLASSNAME}`}
                  href={modelHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ModelAvatar
                    lab={modelInfo?.lab ?? null}
                    quantizedBy={modelInfo?.quantizedBy ?? null}
                  />
                  <span>{modelDisplayName}</span>
                </a>
              ) : (
                <PreservedDeviceLink
                  className={`inline-flex max-w-full items-center gap-2 align-middle ${INTERACTIVE_TEXT_CLASSNAME}`}
                  href={modelHref}
                >
                  <ModelAvatar
                    lab={modelInfo?.lab ?? null}
                    quantizedBy={modelInfo?.quantizedBy ?? null}
                  />
                  <span>{modelDisplayName}</span>
                </PreservedDeviceLink>
              )
            ) : (
              <span className="inline-flex max-w-full items-center gap-2 align-middle text-gray-12">
                <ModelAvatar
                  lab={modelInfo?.lab ?? null}
                  quantizedBy={modelInfo?.quantizedBy ?? null}
                />
                <span>{modelDisplayName}</span>
              </span>
            )}
            <span className="font-normal text-gray-11">{benchmarkOnLabel}</span>
            <PreservedDeviceLink
              className={`inline-flex max-w-full items-center gap-1.5 align-middle ${INTERACTIVE_TEXT_CLASSNAME}`}
              href={deviceHref}
            >
              {ManufacturerLogo && manufacturer ? (
                <span
                  className="flex size-5 items-center justify-center rounded"
                  title={MANUFACTURER_LABEL[manufacturer]}
                >
                  <ManufacturerLogo className="border-gray-7" size={16} />
                </span>
              ) : null}
              <span>{deviceLabel}</span>
            </PreservedDeviceLink>
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm md:text-base">
            <PreservedDeviceLink className={INTERACTIVE_TEXT_CLASSNAME} href="/runs">
              {'<- Runs'}
            </PreservedDeviceLink>
            {runtimePresentation.href ? (
              <a
                className={`flex min-w-fit items-center gap-1 text-nowrap md:gap-1.5 ${INTERACTIVE_TEXT_CLASSNAME}`}
                href={runtimePresentation.href}
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex size-3.5 items-center justify-center rounded md:size-4">
                  {RuntimeLogo ? (
                    <RuntimeLogo className="border-gray-7" size={16} />
                  ) : (
                    <FileQuestionMark className="size-3.5" />
                  )}
                </span>
                <span className="text-sm md:text-base">Runtime</span>
                <ArrowUpRight className="size-3 text-gray-11" />
              </a>
            ) : (
              <div className="flex min-w-fit items-center gap-1 text-nowrap text-gray-11 md:gap-1.5">
                <span className="flex size-3.5 items-center justify-center rounded md:size-4">
                  {RuntimeLogo ? (
                    <RuntimeLogo className="border-gray-7" size={16} />
                  ) : (
                    <FileQuestionMark className="size-3.5" />
                  )}
                </span>
                <span className="text-sm md:text-base">Runtime</span>
              </div>
            )}
            <a
              className={`flex min-w-fit items-center gap-1 text-nowrap md:gap-1.5 ${INTERACTIVE_TEXT_CLASSNAME}`}
              href={harnessHref}
              rel="noreferrer"
              target="_blank"
            >
              <span className="flex size-3.5 items-center justify-center md:size-4">
                <Hammer />
              </span>
              <span className="text-sm md:text-base">Harness</span>
            </a>
            <div className="flex min-w-fit items-center gap-1 text-nowrap text-gray-11 md:gap-1.5">
              <span className="flex size-3.5 items-center justify-center md:size-4">
                <Calendar />
              </span>
              <RelativeDate date={run.createdAt} type="absolute" />
            </div>
            {benchmarkCommand ? (
              <CopyBenchmarkCommandButton command={benchmarkCommand} label="Run" />
            ) : null}
            <CopyRunIdButton id={run.id} label="Run ID" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl grow flex-col px-4 py-4 md:px-0 md:py-6">
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-normal leading-normal text-gray-11 md:text-base">
          <span>
            Runtime {run.runtimeName} {run.runtimeVersion}
          </span>
          <span>·</span>
          <span>
            Harness {run.harnessVersion} {'·'}
            <span className="tabular-nums">{run.harnessGitSha.slice(0, 8)}</span>
          </span>
          {run.runtimeBuildFlags ? (
            <>
              <span>·</span>
              <span>{run.runtimeBuildFlags}</span>
            </>
          ) : null}
        </div>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard
            label="Prompt tokens"
            value={<span>{formatMetricValue(inputTokenSummary)}</span>}
          />
          <MetricCard
            label="Generation tokens"
            value={<span>{formatMetricValue(outputTokenSummary)}</span>}
          />
          <MetricCard
            label="Trials"
            value={
              <span>
                {run.trialsTotal.toLocaleString()}
                <span className="text-gray-11">/{run.trialsPassed.toLocaleString()} passed</span>
              </span>
            }
          />
          <MetricCard label="Status" value={<StatusBadge status={run.status} />} />
          <MetricCard
            label="Decode"
            value={
              <span>
                {formatNumber(run.decodeTpsMean)}
                <span className="text-gray-11"> tok/s</span>
              </span>
            }
          />
          <MetricCard
            label="Prefill"
            value={
              run.prefillTpsMean != null ? (
                <span>
                  {formatNumber(run.prefillTpsMean)}
                  <span className="text-gray-11"> tok/s</span>
                </span>
              ) : (
                '—'
              )
            }
          />
          <MetricCard
            label="Peak memory"
            value={
              <span>
                {formatGb(run.peakRssMb)} GB
                <span className="text-gray-11">/{run.device.ramGb.toLocaleString()} GB</span>
              </span>
            }
          />
          <MetricCard
            label="Runnability"
            value={
              runnabilityScore != null ? <ScoreBadge score={runnabilityScore} size="lg" /> : '—'
            }
          />
        </section>

        {run.notes ? (
          <section className="mt-4 rounded-xl border border-gray-6 bg-gray-2 p-4 md:p-6">
            <h2 className="text-sm font-medium leading-5 text-gray-12 md:text-base">Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-normal text-gray-11 md:text-base">
              {run.notes}
            </p>
          </section>
        ) : null}

        <section className="mt-8">
          <H2 className="mb-3" link>
            Metadata
          </H2>
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
          <H2 className="mb-3" link>
            Trials
          </H2>
          <TrialsDataTable data={trialTableData} />
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge variant="outline" size="lg" type="text" intent={STATUS_BADGE_INTENT[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function ModelAvatar({
  lab,
  quantizedBy,
}: {
  lab: typeof organizations.$inferSelect | null;
  quantizedBy: typeof organizations.$inferSelect | null;
}) {
  if (lab?.logoUrl) {
    return (
      <UserAvatar
        className="border-gray-7"
        icon={
          quantizedBy?.logoUrl ? (
            <UserAvatar image={quantizedBy.logoUrl} name={quantizedBy.name} size={14} />
          ) : undefined
        }
        image={lab.logoUrl}
        name={lab.name}
        size={24}
      />
    );
  }

  if (quantizedBy?.logoUrl) {
    return (
      <UserAvatar
        className="border-gray-7"
        image={quantizedBy.logoUrl}
        name={quantizedBy.name}
        size={24}
      />
    );
  }

  return null;
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-6 bg-gray-2 p-4">
      <h2 className="text-sm font-medium leading-[1.125rem] text-gray-11">{label}</h2>
      <div className="mt-1 block text-lg font-medium tabular-nums leading-6 text-gray-12 md:text-xl">
        {value}
      </div>
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

function getIndefiniteArticle(value: string) {
  const firstToken = value.trim().split(/\s+/)[0] ?? '';
  const acronymAnLetters = new Set(['A', 'E', 'F', 'H', 'I', 'L', 'M', 'N', 'O', 'R', 'S', 'X']);
  if (
    firstToken.length > 0 &&
    /^[A-Z0-9]+$/.test(firstToken) &&
    acronymAnLetters.has(firstToken[0]!)
  ) {
    return 'an';
  }

  const lower = value.trim().toLowerCase();
  if (
    lower.startsWith('apple') ||
    lower.startsWith('amd') ||
    lower.startsWith('intel') ||
    lower.startsWith('nvidia') ||
    /^[aeiou]/.test(lower)
  ) {
    return 'an';
  }

  return 'a';
}

function getModelSourceHref(source: string | null | undefined, runtimeName: string) {
  if (!source) return null;

  if (runtimeName === 'mlx_lm') {
    return `https://huggingface.co/${source}`;
  }

  if (runtimeName === 'llama.cpp') {
    const parts = source.split(':');
    if (parts.length > 1) {
      return `https://huggingface.co/${parts[0]}/blob/main/${parts[1]}`;
    }
  }

  return null;
}

function getRuntimePresentation(runtimeName: string) {
  if (runtimeName === 'llama.cpp') {
    return {
      href: 'https://github.com/ggerganov/llama.cpp',
      Icon: LogoImg.Ggml,
    };
  }

  if (runtimeName === 'mlx_lm') {
    return {
      href: 'https://github.com/ml-explore/mlx-lm',
      Icon: LogoImg.Mlx,
    };
  }

  return {
    href: null,
    Icon: null,
  };
}

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://');
}

function computeRunnabilityScore(run: RunPageValue) {
  if (run.prefillTpsMean == null) return null;

  const decodeScore = normalizeDecodeTps(run.decodeTpsMean);
  const prefillScore = normalizePrefillTps(run.prefillTpsMean);

  if (!hasReliableMemoryData(run)) {
    return 0.65 * decodeScore + 0.35 * prefillScore;
  }

  const estimatedPeakRssMb =
    (run.model.info?.fileSizeBytes || run.model.fileSizeBytes || 0) / (1024 * 1024) + 512;
  const effectivePeakRssMb = run.peakRssMb || estimatedPeakRssMb;
  const memoryScore = Math.max(0, 1 - effectivePeakRssMb / (run.device.ramGb * 716.8));

  return 0.45 * decodeScore + 0.25 * prefillScore + 0.3 * memoryScore;
}

function hasReliableMemoryData(run: RunPageValue) {
  return !(
    (run.runtimeName === 'llama.cpp' &&
      compareHarnessVersions(run.harnessVersion, '0.1.16') <= 0) ||
    (run.device.osName.toLowerCase() !== 'macos' &&
      compareHarnessVersions(run.harnessVersion, '0.1.19') < 0)
  );
}

function compareHarnessVersions(a: string, b: string) {
  return a.localeCompare(b);
}

function normalizeDecodeTps(value: number) {
  if (value >= 100) return 1;
  if (value >= 40) return 0.8 + (0.2 * (value - 40)) / 60;
  if (value >= 20) return 0.6 + (0.2 * (value - 20)) / 20;
  if (value >= 10) return 0.4 + (0.2 * (value - 10)) / 10;
  if (value >= 5) return 0.2 + (0.2 * (value - 5)) / 5;
  return (0.2 * value) / 5;
}

function normalizePrefillTps(value: number) {
  if (value >= 4000) return 1;
  if (value >= 2000) return 0.8 + (0.2 * (value - 2000)) / 2000;
  if (value >= 1000) return 0.6 + (0.2 * (value - 1000)) / 1000;
  if (value >= 500) return 0.4 + (0.2 * (value - 500)) / 500;
  if (value >= 200) return 0.2 + (0.2 * (value - 200)) / 300;
  return (0.2 * value) / 200;
}

function buildMetadata(run: RunPageValue, trialRows: TrialRow[], reward: RewardRow) {
  const inputTokenSummary = summarizeTrialTokens(trialRows, 'inputTokens');
  const outputTokenSummary = summarizeTrialTokens(trialRows, 'outputTokens');
  const runnabilityScore = computeRunnabilityScore(run);
  const benchmarkCommand =
    run.model.info?.source || run.model.source
      ? `bunx whatcanirun@latest run --model ${run.model.info?.source || run.model.source} --runtime ${run.runtimeName} --submit`
      : null;

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
    runnabilityScore,
    benchmarkCommand,
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
