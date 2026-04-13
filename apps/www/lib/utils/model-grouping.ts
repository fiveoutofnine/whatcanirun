import { sql, type SQLWrapper } from 'drizzle-orm';

type ModelGroupKeyInput = {
  artifactSha256: string;
  modelSource?: string | null;
  modelsInfoSource?: string | null;
};

function getNonEmptyString(value?: string | null): string | null {
  if (value == null || value === '') return null;
  return value;
}

export function getModelSource({
  modelSource,
  modelsInfoSource,
}: Omit<ModelGroupKeyInput, 'artifactSha256'>): string | null {
  return getNonEmptyString(modelsInfoSource) ?? getNonEmptyString(modelSource);
}

export function getModelGroupKey({
  artifactSha256,
  modelSource,
  modelsInfoSource,
}: ModelGroupKeyInput): string {
  return getModelSource({ modelSource, modelsInfoSource }) ?? artifactSha256;
}

export function getModelSourceSql(modelsInfoSource: SQLWrapper, modelSource: SQLWrapper) {
  return sql<string | null>`COALESCE(NULLIF(${modelsInfoSource}, ''), NULLIF(${modelSource}, ''))`;
}

export function getModelGroupKeySql(
  modelsInfoSource: SQLWrapper,
  modelSource: SQLWrapper,
  artifactSha256: SQLWrapper,
) {
  return sql<string>`COALESCE(NULLIF(${modelsInfoSource}, ''), NULLIF(${modelSource}, ''), ${artifactSha256})`;
}
