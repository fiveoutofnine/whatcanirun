import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/lib/db';
import { modelFamilies, models, modelsInfo, organizations, runs } from '@/lib/db/schema';
import { scheduleRunTelegramNotification } from '@/lib/services/telegram';
import { getModelGroupKey, getModelGroupKeySql } from '@/lib/utils/model-grouping';

const DEFAULT_BASE_URL = 'https://whatcani.run';

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
      sql: string;
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
  const [firstRun] = await db
    .select({ id: runs.id })
    .from(runs)
    .where(eq(runs.modelId, input.modelId))
    .orderBy(asc(runs.createdAt), asc(runs.id))
    .limit(1);

  if (firstRun?.id !== input.runId) return;

  const action = await getMissingModelMetadataAction(input.modelId);
  if (!action) return;

  const runUrl =
    input.runUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? DEFAULT_BASE_URL}/run/${input.runId}`;
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
  const [model] = await db
    .select({
      id: models.id,
      displayName: models.displayName,
      artifactSha256: models.artifactSha256,
      source: models.source,
      fileSizeBytes: models.fileSizeBytes,
      parameters: models.parameters,
      quant: models.quant,
      architecture: models.architecture,
    })
    .from(models)
    .where(eq(models.id, modelId))
    .limit(1);

  if (!model) return null;

  const [existingInfo] = await db
    .select({ artifactSha256: modelsInfo.artifactSha256 })
    .from(modelsInfo)
    .where(eq(modelsInfo.artifactSha256, model.artifactSha256))
    .limit(1);

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
      sql: buildModelsInfoInsertSql({
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
  const labOrg = alias(organizations, 'missing_metadata_lab_org');
  const quantOrg = alias(organizations, 'missing_metadata_quant_org');

  const [related] = await db
    .select({
      familyId: modelsInfo.familyId,
      familyName: modelFamilies.name,
      familyOrgId: modelFamilies.orgId,
      labId: modelsInfo.labId,
      labName: labOrg.name,
      quantizedById: modelsInfo.quantizedById,
      quantizedByName: quantOrg.name,
    })
    .from(models)
    .innerJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
    .leftJoin(modelFamilies, eq(modelsInfo.familyId, modelFamilies.id))
    .leftJoin(labOrg, eq(modelsInfo.labId, labOrg.id))
    .leftJoin(quantOrg, eq(modelsInfo.quantizedById, quantOrg.id))
    .where(
      and(
        sql`${getModelGroupKeySql(modelsInfo.source, models.source, models.artifactSha256)} = ${modelGroupKey}`,
        sql`${models.artifactSha256} <> ${model.artifactSha256}`,
      ),
    )
    .orderBy(desc(models.createdAt), desc(models.id))
    .limit(1);

  return related ?? null;
}

async function findOrganizationCandidate(source: string): Promise<OrganizationCandidate | null> {
  const namespace = source.split('/')[0]?.trim();
  if (!namespace) return null;

  const slug = slugify(namespace);
  if (!slug) return null;

  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return organization ?? null;
}

function buildModelsInfoInsertSql({
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
    'INSERT INTO models_info (',
    '  artifact_sha256,',
    '  lab_id,',
    '  quantized_by_id,',
    '  family_id,',
    '  name,',
    '  source,',
    '  file_size_bytes,',
    '  parameters,',
    '  quant,',
    '  architecture',
    ') VALUES (',
    `  ${toSqlLiteral(model.artifactSha256)},`,
    `  ${toSqlLiteral(labId)},`,
    `  ${toSqlLiteral(quantizedById)},`,
    `  ${toSqlLiteral(familyId)},`,
    `  ${toSqlLiteral(model.displayName)},`,
    `  ${toSqlLiteral(model.source)},`,
    `  ${toSqlLiteral(model.fileSizeBytes)},`,
    `  ${toSqlLiteral(model.parameters)},`,
    `  ${toSqlLiteral(model.quant)},`,
    `  ${toSqlLiteral(model.architecture)}`,
    ')',
    'ON CONFLICT (artifact_sha256) DO NOTHING;',
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

    return [
      header,
      '',
      ...baseDetails,
      '',
      resolved,
      '',
      payload,
      '',
      action.sql,
    ].join('\n');
  }

  const manualSteps = [
    'I could not produce a safe models_info insert yet.',
    action.reason === 'missing-source'
      ? 'Reason: the model has no stable source repo/group to match against existing metadata.'
      : action.reason === 'missing-family'
        ? 'Reason: related models exist, but none had a usable family_id to copy.'
        : 'Reason: no existing models_info was found for this source group, so this looks like a new model family.',
    'You need to do this manually:',
    '1. Check whether the organization already exists; create it if not.',
    '2. Create the model_families row.',
    '3. Insert the models_info row for this artifact.',
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

function toSqlLiteral(value: number | string | null) {
  if (value == null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${value.replaceAll("'", "''")}'`;
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
