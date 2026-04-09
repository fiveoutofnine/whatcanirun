import { unstable_cache as cache } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import CopyBenchmarkCommandButton from './copy-benchmark-command-button';
import CopyRunIdButton from './copy-run-id-button';
import { ArrowUpRight, Calendar } from 'lucide-react';

import { db } from '@/lib/db';
import { RunStatus } from '@/lib/db/schema';
import { parseManufacturer } from '@/lib/utils';

import PreservedDeviceLink from '@/components/common/preserved-device-link';
import { H2 } from '@/components/templates/mdx';
import RelativeDate from '@/components/templates/relative-date';
import ScoreBadge from '@/components/templates/score-badge';
import UserAvatar from '@/components/templates/user-avatar';
import { Badge, CodeBlock } from '@/components/ui';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const STATUS_BADGE_INTENT = {
  [RunStatus.VERIFIED]: 'success',
  [RunStatus.PENDING]: 'warning',
  [RunStatus.FLAGGED]: 'orange',
  [RunStatus.REJECTED]: 'fail',
} as const;

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const run = await cache(
    async () =>
      db.query.runs.findFirst({
        columns: {
          id: true,
          deviceId: true,
          modelId: true,
          bundleId: true,
          did: true,
          schemaVersion: true,
          status: true,
          notes: true,
          bundleSha256: true,
          runtimeName: true,
          runtimeVersion: true,
          runtimeBuildFlags: true,
          harnessVersion: true,
          harnessGitSha: true,
          contextLength: true,
          promptTokens: true,
          completionTokens: true,
          ttftP50Ms: true,
          decodeTpsMean: true,
          prefillTpsMean: true,
          idleRssMb: true,
          peakRssMb: true,
          trialsPassed: true,
          trialsTotal: true,
          createdAt: true,
        },
        where: (run, { eq }) => eq(run.id, id),
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
    [`run-detail-${id}`],
    { revalidate: 600 },
  )();

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

  // Metadata JSON
  const fileSizeBytes = run.model.info?.fileSizeBytes || run.model.fileSizeBytes || null;
  const metadataJson = JSON.stringify(
    {
      runId: run.id,
      bundleId: run.bundleId,
      status: run.status,
      promptTokens: run.promptTokens,
      completionTokens: run.completionTokens,
      contextLength: run.contextLength,
      harness: {
        version: run.harnessVersion,
        gitSha: run.harnessGitSha,
      },
      runtime: {
        name: run.runtimeName,
        version: run.runtimeVersion,
        buildFlags: run.runtimeBuildFlags,
      },
      model: {
        displayName: modelDisplayName,
        format: run.model.format,
        quant: run.model.info?.quant || run.model.quant,
        architecture: run.model.info?.architecture || run.model.architecture,
        source: modelSource,
        fileSizeBytes,
        lab: modelInfo.lab
          ? {
              name: modelInfo.lab.name,
              slug: modelInfo.lab.slug,
            }
          : null,
        quantizedBy: modelInfo.quantizedBy
          ? {
              name: modelInfo.quantizedBy.name,
              slug: modelInfo.quantizedBy.slug,
            }
          : null,
      },
      device: {
        cpu: run.device.cpu,
        cpuCores: run.device.cpuCores,
        gpu: run.device.gpu,
        gpuCores: run.device.gpuCores,
        gpuCount: run.device.gpuCount,
        ramGb: run.device.ramGb,
        osName: run.device.osName,
        osVersion: run.device.osVersion,
      },
      decodeTpsMean: run.decodeTpsMean,
      prefillTpsMean: run.prefillTpsMean,
      ttftP50Ms: run.ttftP50Ms,
      idleTpsMean: run.idleRssMb,
      peakRssMb: run.peakRssMb,
      trialsPassed: run.trialsPassed,
      trialsTotal: run.trialsTotal,
      runnabilityScore,
      bundleSha256: run.bundleSha256,
      createdAt: run.createdAt,
    },
    null,
    2,
  );

  const ModelAvatar = modelInfo.lab?.logoUrl ? (
    <Fragment>
      <span className="md:hidden">
        <UserAvatar
          icon={
            modelInfo.quantizedBy?.logoUrl ? (
              <UserAvatar
                image={modelInfo.quantizedBy.logoUrl}
                name={modelInfo.quantizedBy.name}
                size={14}
              />
            ) : undefined
          }
          image={modelInfo.lab.logoUrl}
          name={modelInfo.lab.name}
          size={24}
        />
      </span>
      <span className="hidden md:block">
        <UserAvatar
          icon={
            modelInfo.quantizedBy?.logoUrl ? (
              <UserAvatar
                image={modelInfo.quantizedBy.logoUrl}
                name={modelInfo.quantizedBy.name}
                size={14}
              />
            ) : undefined
          }
          image={modelInfo.lab.logoUrl}
          name={modelInfo.lab.name}
          size={30}
        />
      </span>
    </Fragment>
  ) : null;

  return (
    <div className="flex grow flex-col">
      <header className="w-full border-b border-gray-6 bg-black px-4 py-4 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-5xl items-center">
          <div className="flex flex-col gap-1 md:gap-2">
            <h1 className="text-wrap text-2xl font-medium leading-snug tracking-tight text-gray-11 md:text-3xl">
              {modelHref ? (
                modelHref?.startsWith('http://') || modelHref?.startsWith('https://') ? (
                  <a
                    className="inline-flex max-w-full items-center gap-2 align-[-0.125em] text-gray-12 hover:underline"
                    href={modelHref}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {ModelAvatar}
                    <span className="flex">
                      {modelDisplayName}
                      <ArrowUpRight className="size-4 text-gray-11" />
                    </span>
                  </a>
                ) : (
                  <PreservedDeviceLink
                    className="inline-flex max-w-full items-center gap-2 align-[-0.125em] text-gray-12 hover:underline"
                    href={modelHref}
                  >
                    {ModelAvatar}
                    <span>{modelDisplayName}</span>
                  </PreservedDeviceLink>
                )
              ) : (
                <span className="inline-flex max-w-full items-center gap-2 align-[-0.125em] text-gray-12">
                  {ModelAvatar}
                  <span>{modelDisplayName}</span>
                </span>
              )}
              <span className="font-normal text-gray-11"> {benchmarkOnLabel} </span>
              <PreservedDeviceLink
                className="inline-flex max-w-full items-center gap-2 align-[-0.125em] text-gray-12 hover:underline"
                href={deviceHref}
              >
                {ManufacturerLogo && manufacturer ? (
                  <Fragment>
                    <span className="md:hidden">
                      <ManufacturerLogo className="rounded-full" size={24} />
                    </span>
                    <span className="hidden md:block">
                      <ManufacturerLogo className="rounded-full" size={30} />
                    </span>
                  </Fragment>
                ) : null}
                {manufacturer === 'apple' ? (
                  <span>
                    {deviceCountPrefix}
                    {deviceDisplayName}
                    <span className="text-gray-11"> · </span>
                    {run.device.ramGb.toLocaleString()} GB
                  </span>
                ) : (
                  <span>
                    {deviceCountPrefix}
                    {deviceDisplayName}
                  </span>
                )}
              </PreservedDeviceLink>
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-0 text-sm md:gap-x-3 md:pl-[2.375rem] md:text-base">
              <Link
                className="text-gray-11 underline decoration-dotted transition-colors hover:text-gray-12"
                href="/runs"
              >
                &lt;- Runs
              </Link>
              <div className="flex min-w-fit items-center gap-1 text-nowrap text-gray-11 md:gap-1.5">
                <span className="flex size-3.5 items-center justify-center md:size-4">
                  <Calendar />
                </span>
                <RelativeDate date={run.createdAt} type="absolute" />
              </div>
              {benchmarkCommand ? (
                <CopyBenchmarkCommandButton command={benchmarkCommand} label="Command" />
              ) : null}
              <CopyRunIdButton id={run.id} label="Run ID" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl grow flex-col px-4 py-4 md:px-0 md:py-6">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            {
              label: 'Prompt tokens',
              value: <span>{Number(run.promptTokens).toLocaleString()}</span>,
            },
            {
              label: 'Generation tokens',
              value: <span>{Number(run.completionTokens).toLocaleString()}</span>,
            },
            {
              label: 'Trials passed',
              value: (
                <span>
                  {run.trialsTotal.toLocaleString()}
                  <span className="text-gray-11">/{run.trialsPassed.toLocaleString()}</span>
                </span>
              ),
            },
            {
              label: 'Status',
              value: (
                <Fragment>
                  <Badge
                    className="hidden h-7 md:block"
                    variant="outline"
                    size="lg"
                    type="text"
                    intent={STATUS_BADGE_INTENT[run.status]}
                  >
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </Badge>
                  <Badge
                    className="md:hidden"
                    variant="outline"
                    size="md"
                    type="text"
                    intent={STATUS_BADGE_INTENT[run.status]}
                  >
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </Badge>
                </Fragment>
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
                  <span className="text-gray-11">/{run.device.ramGb.toLocaleString()} GB</span>
                </span>
              ),
            },
            {
              label: 'Runnability',
              value:
                runnabilityScore != null ? (
                  <Fragment>
                    <ScoreBadge
                      className="hidden h-7 md:block"
                      score={runnabilityScore}
                      size="lg"
                    />
                    <ScoreBadge className="md:hidden" score={runnabilityScore} size="md" />
                  </Fragment>
                ) : (
                  '—'
                ),
            },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-6 bg-gray-2 p-4">
              <h2 className="text-sm font-medium leading-[1.125rem] text-gray-11">{card.label}</h2>
              <div className="mt-1 line-clamp-1 block text-lg font-medium tabular-nums leading-6 text-gray-12 md:text-xl">
                {card.value}
              </div>
            </div>
          ))}
        </section>

        <H2 className="mb-2 mt-4 md:mt-8">Metadata</H2>
        <CodeBlock
          className="-mx-4 w-[calc(100%+2rem)] rounded-none border-x-0 md:mx-0 md:w-full md:rounded-xl md:border-x [&_[code-block-header]]:rounded-none md:[&_[code-block-header]]:rounded-t-xl [&_[code-block-pre]]:max-h-80 [&_[code-block-pre]]:overflow-y-auto [&_[code-block-pre]]:rounded-none md:[&_[code-block-pre]]:rounded-b-[0.6875rem]"
          fileName="metadata.json"
          language="json"
          showLineNumbers={false}
        >
          {metadataJson}
        </CodeBlock>
      </div>
    </div>
  );
}
