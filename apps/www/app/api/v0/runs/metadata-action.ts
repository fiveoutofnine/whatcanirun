import { db } from '@/lib/db';
import { scheduleRunTelegramNotification } from '@/lib/services/telegram';
import { getModelGroupKey } from '@/lib/utils/model-grouping';

type NotifyMissingModelMetadataActionItemInput = {
  modelId: string;
  runId: string;
  runUrl?: string;
};

type ModelRecord = {
  id: string;
  displayName: string;
  artifactSha256: string;
  source: string | null;
  fileSizeBytes: number | null;
  parameters: string | null;
  quant: string | null;
  architecture: string | null;
};

type RelatedMetadataRecord = {
  familyId: string | null;
  familyName: string | null;
  familyOrgId: string | null;
  labId: string | null;
  labName: string | null;
  quantizedById: string | null;
  quantizedByName: string | null;
};

type RelatedMetadataCandidate = RelatedMetadataRecord & {
  artifactSha256: string;
  modelId: string;
  modelSource: string | null;
  modelsInfoSource: string | null;
  createdAt: Date;
};

type OrganizationCandidate = {
  id: string;
  name: string;
  slug: string;
};

type MissingModelMetadataAction =
  | {
      kind: 'models-info-insert';
      model: ModelRecord;
      modelGroupKey: string;
      familyId: string;
      familyName: string | null;
      labId: string | null;
      labName: string | null;
      quantizedById: string | null;
      quantizedByName: string | null;
      drizzleCode: string;
    }
  | {
      kind: 'manual';
      model: ModelRecord;
      modelGroupKey: string | null;
      reason: 'missing-source' | 'new-model-group' | 'missing-family';
      organizationCandidate: OrganizationCandidate | null;
      relatedMetadataFound: boolean;
    };

export async function notifyMissingModelMetadataActionItem(
  input: NotifyMissingModelMetadataActionItemInput,
) {
  const firstRun = await db.query.runs.findFirst({
    columns: { id: true },
    where: (run, { eq }) => eq(run.modelId, input.modelId),
    orderBy: (run, { asc }) => [asc(run.createdAt), asc(run.id)],
  });

  if (firstRun?.id !== input.runId) return;

  const action = await getMissingModelMetadataAction(input.modelId);
  if (!action) return;

  const runUrl = input.runUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL}/run/${input.runId}`;
  const message = renderActionItemMessage({
    action,
    runId: input.runId,
    runUrl,
  });

  scheduleRunTelegramNotification(message, runUrl);
}

async function getMissingModelMetadataAction(
  modelId: string,
): Promise<MissingModelMetadataAction | null> {
  const model = await db.query.models.findFirst({
    columns: {
      id: true,
      displayName: true,
      artifactSha256: true,
      source: true,
      fileSizeBytes: true,
      parameters: true,
      quant: true,
      architecture: true,
    },
    where: (table, { eq }) => eq(table.id, modelId),
  });

  if (!model) return null;

  const existingInfo = await db.query.modelsInfo.findFirst({
    columns: { artifactSha256: true },
    where: (table, { eq }) => eq(table.artifactSha256, model.artifactSha256),
  });

  if (existingInfo) return null;

  if (!model.source) {
    return {
      kind: 'manual',
      model,
      modelGroupKey: null,
      reason: 'missing-source',
      organizationCandidate: null,
      relatedMetadataFound: false,
    };
  }

  const modelGroupKey = getModelGroupKey({
    artifactSha256: model.artifactSha256,
    modelSource: model.source,
  });

  const relatedMetadata = await getRelatedMetadata(model, modelGroupKey);
  if (relatedMetadata?.familyId) {
    const familyId = relatedMetadata.familyId;
    const labId = relatedMetadata.labId ?? relatedMetadata.familyOrgId;

    return {
      kind: 'models-info-insert',
      model,
      modelGroupKey,
      familyId,
      familyName: relatedMetadata.familyName,
      labId,
      labName: relatedMetadata.labName,
      quantizedById: relatedMetadata.quantizedById,
      quantizedByName: relatedMetadata.quantizedByName,
      drizzleCode: buildModelsInfoInsertDrizzleCode({
        model,
        familyId,
        labId,
        quantizedById: relatedMetadata.quantizedById,
      }),
    };
  }

  return {
    kind: 'manual',
    model,
    modelGroupKey,
    reason: relatedMetadata ? 'missing-family' : 'new-model-group',
    organizationCandidate: await findOrganizationCandidate(model.source),
    relatedMetadataFound: Boolean(relatedMetadata),
  };
}

async function getRelatedMetadata(
  model: ModelRecord,
  modelGroupKey: string,
): Promise<RelatedMetadataRecord | null> {
  const [modelsBySource, infosBySource] = await Promise.all([
    db.query.models.findMany({
      columns: {
        id: true,
        artifactSha256: true,
        source: true,
        createdAt: true,
      },
      where: (table, { eq }) => eq(table.source, modelGroupKey),
      with: {
        info: {
          columns: {
            source: true,
            familyId: true,
            labId: true,
            quantizedById: true,
          },
          with: {
            family: { columns: { id: true, name: true, orgId: true } },
            lab: { columns: { id: true, name: true } },
            quantizedBy: { columns: { id: true, name: true } },
          },
        },
      },
    }),
    db.query.modelsInfo.findMany({
      columns: {
        artifactSha256: true,
        source: true,
        familyId: true,
        labId: true,
        quantizedById: true,
      },
      where: (table, { eq }) => eq(table.source, modelGroupKey),
      with: {
        model: {
          columns: {
            id: true,
            artifactSha256: true,
            source: true,
            createdAt: true,
          },
        },
        family: { columns: { id: true, name: true, orgId: true } },
        lab: { columns: { id: true, name: true } },
        quantizedBy: { columns: { id: true, name: true } },
      },
    }),
  ]);

  const candidates = new Map<string, RelatedMetadataCandidate>();

  for (const candidate of modelsBySource) {
    if (!candidate.info) continue;

    const normalized = toRelatedMetadataCandidate({
      artifactSha256: candidate.artifactSha256,
      modelId: candidate.id,
      modelSource: candidate.source,
      modelsInfoSource: candidate.info.source,
      familyId: candidate.info.familyId,
      familyName: candidate.info.family?.name ?? null,
      familyOrgId: candidate.info.family?.orgId ?? null,
      labId: candidate.info.labId,
      labName: candidate.info.lab?.name ?? null,
      quantizedById: candidate.info.quantizedById,
      quantizedByName: candidate.info.quantizedBy?.name ?? null,
      createdAt: candidate.createdAt,
    });

    maybeStoreRelatedMetadataCandidate(candidates, model, modelGroupKey, normalized);
  }

  for (const candidate of infosBySource) {
    if (!candidate.model) continue;

    const normalized = toRelatedMetadataCandidate({
      artifactSha256: candidate.artifactSha256,
      modelId: candidate.model.id,
      modelSource: candidate.model.source,
      modelsInfoSource: candidate.source,
      familyId: candidate.familyId,
      familyName: candidate.family?.name ?? null,
      familyOrgId: candidate.family?.orgId ?? null,
      labId: candidate.labId,
      labName: candidate.lab?.name ?? null,
      quantizedById: candidate.quantizedById,
      quantizedByName: candidate.quantizedBy?.name ?? null,
      createdAt: candidate.model.createdAt,
    });

    maybeStoreRelatedMetadataCandidate(candidates, model, modelGroupKey, normalized);
  }

  const latest = [...candidates.values()].sort(compareRelatedMetadataCandidates)[0];
  return latest
    ? {
        familyId: latest.familyId,
        familyName: latest.familyName,
        familyOrgId: latest.familyOrgId,
        labId: latest.labId,
        labName: latest.labName,
        quantizedById: latest.quantizedById,
        quantizedByName: latest.quantizedByName,
      }
    : null;
}

function maybeStoreRelatedMetadataCandidate(
  candidates: Map<string, RelatedMetadataCandidate>,
  targetModel: ModelRecord,
  targetModelGroupKey: string,
  candidate: RelatedMetadataCandidate,
) {
  if (candidate.artifactSha256 === targetModel.artifactSha256) return;

  const candidateModelGroupKey = getModelGroupKey({
    artifactSha256: candidate.artifactSha256,
    modelSource: candidate.modelSource,
    modelsInfoSource: candidate.modelsInfoSource,
  });

  if (candidateModelGroupKey !== targetModelGroupKey) return;

  const existing = candidates.get(candidate.artifactSha256);
  if (!existing || compareRelatedMetadataCandidates(candidate, existing) < 0) {
    candidates.set(candidate.artifactSha256, candidate);
  }
}

function toRelatedMetadataCandidate(candidate: RelatedMetadataCandidate): RelatedMetadataCandidate {
  return candidate;
}

function compareRelatedMetadataCandidates(
  left: RelatedMetadataCandidate,
  right: RelatedMetadataCandidate,
) {
  const timeDifference = right.createdAt.getTime() - left.createdAt.getTime();
  if (timeDifference !== 0) return timeDifference;
  return right.modelId.localeCompare(left.modelId);
}

async function findOrganizationCandidate(source: string): Promise<OrganizationCandidate | null> {
  const namespace = source.split('/')[0]?.trim();
  if (!namespace) return null;

  const slug = slugify(namespace);
  if (!slug) return null;

  const organization = await db.query.organizations.findFirst({
    columns: {
      id: true,
      name: true,
      slug: true,
    },
    where: (table, { eq }) => eq(table.slug, slug),
  });

  return organization ?? null;
}

function buildModelsInfoInsertDrizzleCode({
  model,
  familyId,
  labId,
  quantizedById,
}: {
  model: ModelRecord;
  familyId: string;
  labId: string | null;
  quantizedById: string | null;
}) {
  return [
    "import { db } from '@/lib/db';",
    "import { modelsInfo } from '@/lib/db/schema';",
    '',
    'await db',
    '  .insert(modelsInfo)',
    '  .values({',
    `    artifactSha256: ${toCodeLiteral(model.artifactSha256)},`,
    `    labId: ${toCodeLiteral(labId)},`,
    `    quantizedById: ${toCodeLiteral(quantizedById)},`,
    `    familyId: ${toCodeLiteral(familyId)},`,
    `    name: ${toCodeLiteral(model.displayName)},`,
    `    source: ${toCodeLiteral(model.source)},`,
    `    fileSizeBytes: ${toCodeLiteral(model.fileSizeBytes)},`,
    `    parameters: ${toCodeLiteral(model.parameters)},`,
    `    quant: ${toCodeLiteral(model.quant)},`,
    `    architecture: ${toCodeLiteral(model.architecture)},`,
    '  })',
    '  .onConflictDoNothing();',
  ].join('\n');
}

function renderActionItemMessage({
  action,
  runId,
  runUrl,
}: {
  action: MissingModelMetadataAction;
  runId: string;
  runUrl: string;
}) {
  const header =
    action.kind === 'models-info-insert'
      ? '[whatcanirun] models_info follow-up ready'
      : '[whatcanirun] Manual model metadata follow-up required';

  const baseDetails = [
    `Run: ${runId}`,
    `Run URL: ${runUrl}`,
    `Model: ${action.model.displayName}`,
    `Source: ${action.model.source ?? '(none)'}`,
    `Artifact: ${action.model.artifactSha256}`,
  ];

  const payload = [
    'models_info payload:',
    `artifact_sha256 = ${action.model.artifactSha256}`,
    `name = ${action.model.displayName}`,
    `source = ${action.model.source ?? 'NULL'}`,
    `file_size_bytes = ${action.model.fileSizeBytes ?? 'NULL'}`,
    `parameters = ${action.model.parameters ?? 'NULL'}`,
    `quant = ${action.model.quant ?? 'NULL'}`,
    `architecture = ${action.model.architecture ?? 'NULL'}`,
  ].join('\n');

  if (action.kind === 'models-info-insert') {
    const resolved = [
      'Resolved from an existing model group:',
      `family = ${action.familyName ?? action.familyId} (${action.familyId})`,
      `lab = ${action.labName ?? 'NULL'} (${action.labId ?? 'NULL'})`,
      `quantized_by = ${action.quantizedByName ?? 'NULL'} (${action.quantizedById ?? 'NULL'})`,
      `model_group = ${action.modelGroupKey}`,
    ].join('\n');

    return [header, '', ...baseDetails, '', resolved, '', payload, '', action.drizzleCode].join(
      '\n',
    );
  }

  const manualSteps = [
    'I could not produce a safe models_info Drizzle insert yet.',
    action.reason === 'missing-source'
      ? 'Reason: the model has no stable source repo/group to match against existing metadata.'
      : action.reason === 'missing-family'
        ? 'Reason: related models exist, but none had a usable family_id to copy.'
        : 'Reason: no existing models_info was found for this source group, so this looks like a new model family.',
    'You need to do this manually:',
    '1. Check whether the organization already exists; create it if not.',
    '2. Create the model_families row.',
    '3. Insert the models_info row for this artifact with Drizzle.',
  ].join('\n');

  const candidate = action.organizationCandidate
    ? `Existing organization candidate:\n${action.organizationCandidate.name} (${action.organizationCandidate.id}) slug=${action.organizationCandidate.slug}`
    : action.model.source
      ? `Likely organization slug: ${slugify(action.model.source.split('/')[0] ?? '') || '(unknown)'}`
      : null;

  const group = action.modelGroupKey ? `model_group = ${action.modelGroupKey}` : null;
  const context = [
    candidate,
    group,
    action.relatedMetadataFound
      ? 'Related model metadata rows exist, but family resolution is still incomplete.'
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    header,
    '',
    ...baseDetails,
    '',
    payload,
    '',
    manualSteps,
    ...(context ? ['', context] : []),
  ].join('\n');
}

function toCodeLiteral(value: number | string | null) {
  if (value == null) return 'null';
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[®™©]/g, '')
    .replace(/\((?:r|tm|c)\)/gi, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
}
