import { notFound } from 'next/navigation';

import CopyBenchmarkCommandButton from './copy-benchmark-command-button';
import CopyRunIdButton from './copy-run-id-button';
import { asc, eq } from 'drizzle-orm';
import { ArrowUpRight, Calendar, FileQuestionMark, Hammer } from 'lucide-react';

import { MANUFACTURER_LABEL } from '@/lib/constants/gpu';
import { db } from '@/lib/db';
import { rewards, runs, RunStatus, trials } from '@/lib/db/schema';
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

const INTERACTIVE_TEXT_CLASSNAME =
  'text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12';

const RUNTIME_PRESENTATION = {
  'llama.cpp': { href: 'https://github.com/ggerganov/llama.cpp', Icon: LogoImg.Ggml },
  mlx_lm: { href: 'https://github.com/ml-explore/mlx-lm', Icon: LogoImg.Mlx },
} as const;

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

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

  // Model href
  const modelHref = (() => {
    if (modelInfo?.lab?.slug && modelInfo.family?.slug)
      return `/${modelInfo.lab.slug}/${modelInfo.family.slug}`;
    if (modelInfo?.lab?.slug) return `/${modelInfo.lab.slug}`;
    const source = run.model.info?.source || run.model.source;
    if (!source) return null;
    if (run.runtimeName === 'mlx_lm') return `https://huggingface.co/${source}`;
    if (run.runtimeName === 'llama.cpp') {
      const parts = source.split(':');
      if (parts.length > 1) return `https://huggingface.co/${parts[0]}/blob/main/${parts[1]}`;
    }
    return null;
  })();

  const deviceHref = `/device?device=${encodeURIComponent(run.device.chipId)}`;
  const deviceCountPrefix =
    manufacturer !== 'apple' && run.device.gpuCount > 1 ? `${run.device.gpuCount}× ` : '';
  const deviceLabel = `${deviceCountPrefix}${deviceDisplayName} · ${run.device.ramGb.toLocaleString()} GB`;

  // Indefinite article
  const benchmarkOnLabel = (() => {
    if (deviceCountPrefix) return 'benchmark on';
    const firstToken = deviceDisplayName.trim().split(/\s+/)[0] ?? '';
    const acronymAnLetters = new Set(['A', 'E', 'F', 'H', 'I', 'L', 'M', 'N', 'O', 'R', 'S', 'X']);
    if (
      firstToken.length > 0 &&
      /^[A-Z0-9]+$/.test(firstToken) &&
      acronymAnLetters.has(firstToken[0]!)
    )
      return 'benchmark on an';
    const lower = deviceDisplayName.trim().toLowerCase();
    if (
      lower.startsWith('apple') ||
      lower.startsWith('amd') ||
      lower.startsWith('intel') ||
      lower.startsWith('nvidia') ||
      /^[aeiou]/.test(lower)
    )
      return 'benchmark on an';
    return 'benchmark on a';
  })();

  const runtimePresentation = RUNTIME_PRESENTATION[
    run.runtimeName as keyof typeof RUNTIME_PRESENTATION
  ] ?? {
    href: null,
    Icon: null,
  };
  const RuntimeLogo = runtimePresentation.Icon;
  const harnessHref = `https://github.com/fiveoutofnine/whatcanirun/commit/${run.harnessGitSha}`;
  const benchmarkCommand = modelSource
    ? `bunx whatcanirun@latest run --model ${modelSource} --runtime ${run.runtimeName} --submit`
    : null;

  // Runnability score
  const runnabilityScore = (() => {
    if (run.prefillTpsMean == null) return null;

    const normalizeDecode = (v: number) => {
      if (v >= 100) return 1;
      if (v >= 40) return 0.8 + (0.2 * (v - 40)) / 60;
      if (v >= 20) return 0.6 + (0.2 * (v - 20)) / 20;
      if (v >= 10) return 0.4 + (0.2 * (v - 10)) / 10;
      if (v >= 5) return 0.2 + (0.2 * (v - 5)) / 5;
      return (0.2 * v) / 5;
    };
    const normalizePrefill = (v: number) => {
      if (v >= 4000) return 1;
      if (v >= 2000) return 0.8 + (0.2 * (v - 2000)) / 2000;
      if (v >= 1000) return 0.6 + (0.2 * (v - 1000)) / 1000;
      if (v >= 500) return 0.4 + (0.2 * (v - 500)) / 500;
      if (v >= 200) return 0.2 + (0.2 * (v - 200)) / 300;
      return (0.2 * v) / 200;
    };

    const decodeScore = normalizeDecode(run.decodeTpsMean);
    const prefillScore = normalizePrefill(run.prefillTpsMean);

    const unreliableMemory =
      (run.runtimeName === 'llama.cpp' && run.harnessVersion.localeCompare('0.1.16') <= 0) ||
      (run.device.osName.toLowerCase() !== 'macos' &&
        run.harnessVersion.localeCompare('0.1.19') < 0);
    if (unreliableMemory) return 0.65 * decodeScore + 0.35 * prefillScore;

    const estimatedPeakRssMb =
      (run.model.info?.fileSizeBytes || run.model.fileSizeBytes || 0) / (1024 * 1024) + 512;
    const effectivePeakRssMb = run.peakRssMb || estimatedPeakRssMb;
    const memoryScore = Math.max(0, 1 - effectivePeakRssMb / (run.device.ramGb * 716.8));

    return 0.45 * decodeScore + 0.25 * prefillScore + 0.3 * memoryScore;
  })();

  // Token summaries
  const summarizeTokens = (key: 'inputTokens' | 'outputTokens') => {
    if (trialRows.length === 0) return null;
    const values = trialRows.map((t) => t[key]);
    const first = values[0];
    if (values.every((v) => v === first)) return { kind: 'uniform' as const, value: first };
    return { kind: 'range' as const, min: Math.min(...values), max: Math.max(...values) };
  };
  const inputTokenSummary = summarizeTokens('inputTokens');
  const outputTokenSummary = summarizeTokens('outputTokens');

  const formatTokenSummary = (
    s: { kind: 'uniform'; value: number } | { kind: 'range'; min: number; max: number } | null,
  ) => {
    if (!s) return '—';
    if (s.kind === 'uniform') return s.value.toLocaleString();
    return `${s.min.toLocaleString()}-${s.max.toLocaleString()}`;
  };

  // Metadata JSON
  const fileSizeBytes = run.model.info?.fileSizeBytes || run.model.fileSizeBytes || null;
  const metadataJson = JSON.stringify(
    {
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
        displayName: modelDisplayName,
        quant: run.model.info?.quant || run.model.quant,
        format: run.model.format,
        source: modelSource,
        fileSize: fileSizeBytes,
        fileSizeFormatted: fileSizeBytes ? formatBytes(fileSizeBytes) : null,
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
    },
    null,
    2,
  );

  // Model avatar
  const lab = modelInfo?.lab ?? null;
  const quantizedBy = modelInfo?.quantizedBy ?? null;
  const modelAvatar = lab?.logoUrl ? (
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
  ) : quantizedBy?.logoUrl ? (
    <UserAvatar
      className="border-gray-7"
      image={quantizedBy.logoUrl}
      name={quantizedBy.name}
      size={24}
    />
  ) : null;

  const isExternal = modelHref?.startsWith('http://') || modelHref?.startsWith('https://');

  return (
    <div className="flex grow flex-col">
      <header className="w-full border-b border-gray-6 bg-black px-4 py-4 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          <h1 className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-2xl font-normal leading-snug tracking-tight text-gray-11 md:text-3xl">
            {modelHref ? (
              isExternal ? (
                <a
                  className={`inline-flex max-w-full items-center gap-2 align-middle ${INTERACTIVE_TEXT_CLASSNAME}`}
                  href={modelHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  {modelAvatar}
                  <span>{modelDisplayName}</span>
                </a>
              ) : (
                <PreservedDeviceLink
                  className={`inline-flex max-w-full items-center gap-2 align-middle ${INTERACTIVE_TEXT_CLASSNAME}`}
                  href={modelHref}
                >
                  {modelAvatar}
                  <span>{modelDisplayName}</span>
                </PreservedDeviceLink>
              )
            ) : (
              <span className="inline-flex max-w-full items-center gap-2 align-middle text-gray-12">
                {modelAvatar}
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
          {[
            { label: 'Prompt tokens', value: <span>{formatTokenSummary(inputTokenSummary)}</span> },
            {
              label: 'Generation tokens',
              value: <span>{formatTokenSummary(outputTokenSummary)}</span>,
            },
            {
              label: 'Trials',
              value: (
                <span>
                  {run.trialsTotal.toLocaleString()}
                  <span className="text-gray-11">/{run.trialsPassed.toLocaleString()} passed</span>
                </span>
              ),
            },
            {
              label: 'Status',
              value: (
                <Badge
                  variant="outline"
                  size="lg"
                  type="text"
                  intent={STATUS_BADGE_INTENT[run.status]}
                >
                  {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                </Badge>
              ),
            },
            {
              label: 'Decode',
              value: (
                <span>
                  {Number(run.decodeTpsMean).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}
                  <span className="text-gray-11"> tok/s</span>
                </span>
              ),
            },
            {
              label: 'Prefill',
              value:
                run.prefillTpsMean != null ? (
                  <span>
                    {Number(run.prefillTpsMean).toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                    <span className="text-gray-11"> tok/s</span>
                  </span>
                ) : (
                  '—'
                ),
            },
            {
              label: 'Peak memory',
              value: (
                <span>
                  {Number(run.peakRssMb / 1024).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2,
                  })}
                  <span className="text-gray-11"> GB</span>
                  <span className="text-gray-11">/{run.device.ramGb.toLocaleString()} GB</span>
                </span>
              ),
            },
            {
              label: 'Runnability',
              value:
                runnabilityScore != null ? <ScoreBadge score={runnabilityScore} size="lg" /> : '—',
            },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-6 bg-gray-2 p-4">
              <h2 className="text-sm font-medium leading-[1.125rem] text-gray-11">{card.label}</h2>
              <div className="mt-1 block text-lg font-medium tabular-nums leading-6 text-gray-12 md:text-xl">
                {card.value}
              </div>
            </div>
          ))}
        </section>

        <H2 className="mb-2 mt-4 md:mt-8">Metadata</H2>
        <CodeBlock
          className="-mx-4 w-[calc(100%+2rem)] rounded-none border-x-0 md:mx-0 md:w-full md:rounded-xl md:border-x [&_[code-block-header]]:rounded-none md:[&_[code-block-header]]:rounded-t-xl [&_[code-block-pre]]:max-h-80 [&_[code-block-pre]]:overflow-y-auto [&_[code-block-pre]]:rounded-none md:[&_[code-block-pre]]:rounded-b-[0.6875rem]"
          fileName="metadata.json"
          language="none"
          showLineNumbers={false}
        >
          {metadataJson}
        </CodeBlock>
      </div>
    </div>
  );
}
