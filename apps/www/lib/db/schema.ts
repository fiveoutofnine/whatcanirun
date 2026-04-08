import { and, count, countDistinct, eq, relations, sql } from 'drizzle-orm';
import {
  alias,
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgMaterializedView,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import enumToPgEnum from '@/lib/utils/enum-to-pg-enum';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
}

export const userRoleEnum = pgEnum('role', enumToPgEnum(UserRole));

export enum RunStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FLAGGED = 'flagged',
  REJECTED = 'rejected',
}

export const runStatusEnum = pgEnum('run_status', enumToPgEnum(RunStatus));

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `user_${crypto.randomUUID()}`),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default(UserRole.USER),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `tok_${crypto.randomUUID()}`),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').unique(),
    name: text('name').notNull(),
    code: text('code').unique(),
    codeExpiresAt: timestamp('code_expires_at'),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('api_tokens_user_code_idx').on(t.userId, t.code)],
);

// -----------------------------------------------------------------------------
// Devices
// -----------------------------------------------------------------------------

export const devices = pgTable(
  'devices',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `dev_${crypto.randomUUID()}`),
    cpu: text('cpu').notNull(),
    cpuCores: integer('cpu_cores').notNull(),
    gpu: text('gpu').notNull(),
    gpuCores: integer('gpu_cores').notNull(),
    gpuCount: integer('gpu_count').notNull().default(1),
    ramGb: integer('ram_gb').notNull(),
    chipId: text('chip_id').notNull(),
    osName: text('os_name').notNull(),
    osVersion: text('os_version').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('devices_dedup_idx').on(
      t.cpu,
      t.cpuCores,
      t.gpu,
      t.gpuCores,
      t.gpuCount,
      t.ramGb,
      t.osName,
      t.osVersion,
    ),
    index('devices_chip_id_idx').on(t.chipId),
  ],
);

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

export const models = pgTable('models', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `model_${crypto.randomUUID()}`),
  displayName: text('display_name').notNull(),
  format: text('format').notNull(),
  artifactSha256: text('artifact_sha256').notNull().unique(),
  source: text('source'),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
  parameters: text('parameters'),
  quant: text('quant'),
  architecture: text('architecture'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => `org_${crypto.randomUUID()}`),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const modelFamilies = pgTable(
  'model_families',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `fam_${crypto.randomUUID()}`),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    parameters: text('parameters'),
    license: text('license'),
    releaseDate: timestamp('release_date'),
    tags: jsonb('tags'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('model_families_org_slug_idx').on(t.orgId, t.slug),
    index('model_families_org_id_idx').on(t.orgId),
  ],
);

export const modelsInfo = pgTable(
  'models_info',
  {
    artifactSha256: text('artifact_sha256')
      .primaryKey()
      .references(() => models.artifactSha256),
    labId: text('lab_id').references(() => organizations.id),
    quantizedById: text('quantized_by_id').references(() => organizations.id),
    familyId: text('family_id').references(() => modelFamilies.id),
    // Overrides `models` column values
    name: text('name'),
    source: text('source'),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
    parameters: text('parameters'),
    quant: text('quant'),
    architecture: text('architecture'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('models_info_lab_id_idx').on(t.labId),
    index('models_info_quantized_by_id_idx').on(t.quantizedById),
    index('models_info_family_id_idx').on(t.familyId),
  ],
);
// -----------------------------------------------------------------------------
// Runs
// -----------------------------------------------------------------------------

export const runs = pgTable(
  'runs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `run_${crypto.randomUUID()}`),
    userId: text('user_id').references(() => users.id),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id),
    modelId: text('model_id')
      .notNull()
      .references(() => models.id),
    bundleId: text('bundle_id').notNull().unique(),
    did: text('did'),
    schemaVersion: text('schema_version').notNull(),
    status: runStatusEnum('status').notNull().default(RunStatus.PENDING),
    notes: text('notes'),
    bundleSha256: text('bundle_sha256').notNull().unique(),
    runtimeName: text('runtime_name').notNull(),
    runtimeVersion: text('runtime_version').notNull(),
    runtimeBuildFlags: text('runtime_build_flags'),
    harnessVersion: text('harness_version').notNull(),
    harnessGitSha: text('harness_git_sha').notNull(),
    contextLength: integer('context_length'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    ipHash: text('ip_hash'),
    ttftP50Ms: real('ttft_p50_ms').notNull(),
    ttftP95Ms: real('ttft_p95_ms').notNull(),
    decodeTpsMean: real('decode_tps_mean').notNull(),
    prefillTpsMean: real('prefill_tps_mean'),
    idleRssMb: real('idle_rss_mb').notNull(),
    peakRssMb: real('peak_rss_mb').notNull(),
    trialsPassed: integer('trials_passed').notNull(),
    trialsTotal: integer('trials_total').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('runs_leaderboard_idx').on(t.modelId, t.status, t.decodeTpsMean),
    index('runs_device_idx').on(t.deviceId),
    index('runs_user_idx').on(t.userId),
  ],
);

export const trials = pgTable(
  'trials',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `trial_${crypto.randomUUID()}`),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    trialIndex: integer('trial_index').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    ttftMs: real('ttft_ms').notNull(),
    totalMs: real('total_ms').notNull(),
    prefillTps: real('prefill_tps').notNull(),
    decodeTps: real('decode_tps').notNull(),
    idleRssMb: real('idle_rss_mb').notNull(),
    peakRssMb: real('peak_rss_mb').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('trials_run_trial_idx').on(t.runId, t.trialIndex),
    index('trials_decode_tps_idx').on(t.decodeTps),
    index('trials_ttft_idx').on(t.ttftMs),
  ],
);

// -----------------------------------------------------------------------------
// Views
// -----------------------------------------------------------------------------

const labOrg = alias(organizations, 'lab_org');
const quantOrg = alias(organizations, 'quant_org');

export const view__model_stats_by_device = pgMaterializedView('view__model_stats_by_device').as(
  (qb) =>
    qb
      .select({
        // Model (prefer modelsInfo overrides, fall back to models)
        modelId: sql<string>`${models.id}`.as('model_id'),
        modelDisplayName:
          sql<string>`COALESCE(NULLIF(MIN(${modelsInfo.name}), ''), ${models.displayName})`.as(
            'model_display_name',
          ),
        modelFormat: models.format,
        modelFileSizeBytes: sql<
          number | null
        >`COALESCE(NULLIF(MIN(${modelsInfo.fileSizeBytes}), 0), ${models.fileSizeBytes})`.as(
          'model_file_size_bytes',
        ),
        modelParameters: sql<
          string | null
        >`COALESCE(NULLIF(MIN(${modelsInfo.parameters}), ''), ${models.parameters})`.as(
          'model_parameters',
        ),
        modelQuant: sql<
          string | null
        >`COALESCE(NULLIF(MIN(${modelsInfo.quant}), ''), ${models.quant})`.as('model_quant'),
        modelArchitecture: sql<
          string | null
        >`COALESCE(NULLIF(MIN(${modelsInfo.architecture}), ''), ${models.architecture})`.as(
          'model_architecture',
        ),
        modelSource: sql<
          string | null
        >`COALESCE(NULLIF(MIN(${modelsInfo.source}), ''), ${models.source})`.as('model_source'),
        // Organization
        labName: sql<string | null>`MIN(${labOrg.name})`.as('lab_name'),
        labLogoUrl: sql<string | null>`MIN(${labOrg.logoUrl})`.as('lab_logo_url'),
        labWebsiteUrl: sql<string | null>`MIN(${labOrg.websiteUrl})`.as('lab_website_url'),
        labSlug: sql<string | null>`MIN(${labOrg.slug})`.as('lab_slug'),
        familySlug: sql<string | null>`MIN(${modelFamilies.slug})`.as('family_slug'),
        quantizedByName: sql<string | null>`MIN(${quantOrg.name})`.as('quantized_by_name'),
        quantizedByLogoUrl: sql<string | null>`MIN(${quantOrg.logoUrl})`.as(
          'quantized_by_logo_url',
        ),
        quantizedByWebsiteUrl: sql<string | null>`MIN(${quantOrg.websiteUrl})`.as(
          'quantized_by_website_url',
        ),
        // Device
        deviceChipId: devices.chipId,
        deviceCpu: sql<string>`MIN(${devices.cpu})`.as('device_cpu'),
        deviceCpuCores: sql<number>`MIN(${devices.cpuCores})`.as('device_cpu_cores'),
        deviceGpu: sql<string>`MIN(${devices.gpu})`.as('device_gpu'),
        deviceGpuCores: sql<number>`MIN(${devices.gpuCores})`.as('device_gpu_cores'),
        deviceGpuCount: sql<number>`MIN(${devices.gpuCount})`.as('device_gpu_count'),
        deviceRamGb: sql<number>`MIN(${devices.ramGb})`.as('device_ram_gb'),
        // Stats
        runtimeName: runs.runtimeName,
        runCount: countDistinct(runs.id).as('run_count'),
        trialCount: count(trials.id).as('trial_count'),
        ttftP50Ms: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${trials.ttftMs})`.as(
          'ttft_p50_ms',
        ),
        ttftP95Ms: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${trials.ttftMs})`.as(
          'ttft_p95_ms',
        ),
        avgDecodeTps: sql<number>`AVG(${trials.decodeTps})`.as('avg_decode_tps'),
        avgPrefillTps: sql<number>`AVG(${trials.prefillTps})`.as('avg_prefill_tps'),
        // Memory: exclude under-reported llama.cpp readings (harnessVersion <= 0.1.16)
        // and non-macOS readings (harnessVersion < 0.1.19) which report system RAM, not VRAM
        avgIdleRssMb: sql<number>`
          COALESCE(AVG(
            CASE WHEN NOT (${runs.runtimeName} = 'llama.cpp' AND ${runs.harnessVersion} <= '0.1.16')
              AND NOT (LOWER(${devices.osName}) != 'macos' AND ${runs.harnessVersion} < '0.1.19')
              THEN ${trials.idleRssMb}
            END
          ), 0)
        `.as('avg_idle_rss_mb'),
        avgPeakRssMb: sql<number>`
          COALESCE(AVG(
            CASE WHEN NOT (${runs.runtimeName} = 'llama.cpp' AND ${runs.harnessVersion} <= '0.1.16')
              AND NOT (LOWER(${devices.osName}) != 'macos' AND ${runs.harnessVersion} < '0.1.19')
              THEN ${trials.peakRssMb}
            END
          ), 0)
        `.as('avg_peak_rss_mb'),
        compositeScore: sql<number>`(
          CASE
          -- When reliable memory data exists, use full formula (decode + prefill + memory)
          WHEN AVG(
            CASE WHEN NOT (${runs.runtimeName} = 'llama.cpp' AND ${runs.harnessVersion} <= '0.1.16')
              AND NOT (LOWER(${devices.osName}) != 'macos' AND ${runs.harnessVersion} < '0.1.19')
              THEN ${trials.peakRssMb}
            END
          ) IS NOT NULL THEN
            0.45 * (CASE
              WHEN AVG(${trials.decodeTps}) >= 100 THEN 1.0
              WHEN AVG(${trials.decodeTps}) >= 40  THEN 0.8 + 0.2 * (AVG(${trials.decodeTps}) - 40) / 60.0
              WHEN AVG(${trials.decodeTps}) >= 20  THEN 0.6 + 0.2 * (AVG(${trials.decodeTps}) - 20) / 20.0
              WHEN AVG(${trials.decodeTps}) >= 10  THEN 0.4 + 0.2 * (AVG(${trials.decodeTps}) - 10) / 10.0
              WHEN AVG(${trials.decodeTps}) >= 5   THEN 0.2 + 0.2 * (AVG(${trials.decodeTps}) - 5) / 5.0
              ELSE 0.2 * AVG(${trials.decodeTps}) / 5.0
            END)
            + 0.25 * (CASE
              WHEN AVG(${trials.prefillTps}) >= 4000 THEN 1.0
              WHEN AVG(${trials.prefillTps}) >= 2000 THEN 0.8 + 0.2 * (AVG(${trials.prefillTps}) - 2000) / 2000.0
              WHEN AVG(${trials.prefillTps}) >= 1000 THEN 0.6 + 0.2 * (AVG(${trials.prefillTps}) - 1000) / 1000.0
              WHEN AVG(${trials.prefillTps}) >= 500  THEN 0.4 + 0.2 * (AVG(${trials.prefillTps}) - 500) / 500.0
              WHEN AVG(${trials.prefillTps}) >= 200  THEN 0.2 + 0.2 * (AVG(${trials.prefillTps}) - 200) / 300.0
              ELSE 0.2 * AVG(${trials.prefillTps}) / 200.0
            END)
            -- 716.8 = 0.7 * 1024: only ~70% of device RAM is usable headroom
            -- Peak RSS falls back to file-size estimate when bugged readings are excluded
            + 0.30 * GREATEST(0, 1.0 - COALESCE(
                AVG(CASE WHEN NOT (${runs.runtimeName} = 'llama.cpp' AND ${runs.harnessVersion} <= '0.1.16')
                  AND NOT (LOWER(${devices.osName}) != 'macos' AND ${runs.harnessVersion} < '0.1.19')
                  THEN ${trials.peakRssMb}
                END),
                COALESCE(NULLIF(MIN(${modelsInfo.fileSizeBytes}), 0), ${models.fileSizeBytes})
                  / (1024.0 * 1024.0) + 512.0
              ) / (MIN(${devices.ramGb}) * 716.8))
          -- No reliable memory data (non-macOS < 0.1.19): score on speed only
          ELSE
            0.65 * (CASE
              WHEN AVG(${trials.decodeTps}) >= 100 THEN 1.0
              WHEN AVG(${trials.decodeTps}) >= 40  THEN 0.8 + 0.2 * (AVG(${trials.decodeTps}) - 40) / 60.0
              WHEN AVG(${trials.decodeTps}) >= 20  THEN 0.6 + 0.2 * (AVG(${trials.decodeTps}) - 20) / 20.0
              WHEN AVG(${trials.decodeTps}) >= 10  THEN 0.4 + 0.2 * (AVG(${trials.decodeTps}) - 10) / 10.0
              WHEN AVG(${trials.decodeTps}) >= 5   THEN 0.2 + 0.2 * (AVG(${trials.decodeTps}) - 5) / 5.0
              ELSE 0.2 * AVG(${trials.decodeTps}) / 5.0
            END)
            + 0.35 * (CASE
              WHEN AVG(${trials.prefillTps}) >= 4000 THEN 1.0
              WHEN AVG(${trials.prefillTps}) >= 2000 THEN 0.8 + 0.2 * (AVG(${trials.prefillTps}) - 2000) / 2000.0
              WHEN AVG(${trials.prefillTps}) >= 1000 THEN 0.6 + 0.2 * (AVG(${trials.prefillTps}) - 1000) / 1000.0
              WHEN AVG(${trials.prefillTps}) >= 500  THEN 0.4 + 0.2 * (AVG(${trials.prefillTps}) - 500) / 500.0
              WHEN AVG(${trials.prefillTps}) >= 200  THEN 0.2 + 0.2 * (AVG(${trials.prefillTps}) - 200) / 300.0
              ELSE 0.2 * AVG(${trials.prefillTps}) / 200.0
            END)
          END
        )`.as('composite_score'),
      })
      .from(trials)
      .innerJoin(runs, eq(trials.runId, runs.id))
      .innerJoin(models, eq(runs.modelId, models.id))
      .innerJoin(devices, eq(runs.deviceId, devices.id))
      .leftJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
      .leftJoin(labOrg, eq(modelsInfo.labId, labOrg.id))
      .leftJoin(quantOrg, eq(modelsInfo.quantizedById, quantOrg.id))
      .leftJoin(modelFamilies, eq(modelsInfo.familyId, modelFamilies.id))
      .where(
        and(
          eq(runs.status, RunStatus.VERIFIED),
          eq(trials.inputTokens, 4096),
          eq(trials.outputTokens, 1024),
        ),
      )
      .groupBy(models.id, devices.chipId, runs.runtimeName),
);

export const view__model_device_summary = pgMaterializedView('view__model_device_summary').as(
  (qb) =>
    qb
      .select({
        modelId: sql<string>`${models.id}`.as('model_id'),
        familyId: sql<string | null>`MIN(${modelsInfo.familyId})`.as('family_id'),
        deviceChipId: devices.chipId,
        deviceCpu: sql<string>`MIN(${devices.cpu})`.as('device_cpu'),
        deviceCpuCores: sql<number>`MIN(${devices.cpuCores})`.as('device_cpu_cores'),
        deviceGpu: sql<string>`MIN(${devices.gpu})`.as('device_gpu'),
        deviceGpuCores: sql<number>`MIN(${devices.gpuCores})`.as('device_gpu_cores'),
        deviceGpuCount: sql<number>`MIN(${devices.gpuCount})`.as('device_gpu_count'),
        deviceRamGb: sql<number>`MIN(${devices.ramGb})`.as('device_ram_gb'),
        avgDecodeTps: sql<number>`AVG(${trials.decodeTps})`.as('avg_decode_tps'),
        avgPrefillTps: sql<number>`AVG(${trials.prefillTps})`.as('avg_prefill_tps'),
        compositeScore: sql<number>`(
          CASE
          WHEN AVG(
            CASE WHEN NOT (${runs.runtimeName} = 'llama.cpp' AND ${runs.harnessVersion} <= '0.1.16')
              AND NOT (LOWER(${devices.osName}) != 'macos' AND ${runs.harnessVersion} < '0.1.19')
              THEN ${trials.peakRssMb}
            END
          ) IS NOT NULL THEN
            0.45 * (CASE
              WHEN AVG(${trials.decodeTps}) >= 100 THEN 1.0
              WHEN AVG(${trials.decodeTps}) >= 40  THEN 0.8 + 0.2 * (AVG(${trials.decodeTps}) - 40) / 60.0
              WHEN AVG(${trials.decodeTps}) >= 20  THEN 0.6 + 0.2 * (AVG(${trials.decodeTps}) - 20) / 20.0
              WHEN AVG(${trials.decodeTps}) >= 10  THEN 0.4 + 0.2 * (AVG(${trials.decodeTps}) - 10) / 10.0
              WHEN AVG(${trials.decodeTps}) >= 5   THEN 0.2 + 0.2 * (AVG(${trials.decodeTps}) - 5) / 5.0
              ELSE 0.2 * AVG(${trials.decodeTps}) / 5.0
            END)
            + 0.25 * (CASE
              WHEN AVG(${trials.prefillTps}) >= 4000 THEN 1.0
              WHEN AVG(${trials.prefillTps}) >= 2000 THEN 0.8 + 0.2 * (AVG(${trials.prefillTps}) - 2000) / 2000.0
              WHEN AVG(${trials.prefillTps}) >= 1000 THEN 0.6 + 0.2 * (AVG(${trials.prefillTps}) - 1000) / 1000.0
              WHEN AVG(${trials.prefillTps}) >= 500  THEN 0.4 + 0.2 * (AVG(${trials.prefillTps}) - 500) / 500.0
              WHEN AVG(${trials.prefillTps}) >= 200  THEN 0.2 + 0.2 * (AVG(${trials.prefillTps}) - 200) / 300.0
              ELSE 0.2 * AVG(${trials.prefillTps}) / 200.0
            END)
            + 0.30 * GREATEST(0, 1.0 - COALESCE(
                AVG(CASE WHEN NOT (${runs.runtimeName} = 'llama.cpp' AND ${runs.harnessVersion} <= '0.1.16')
                  AND NOT (LOWER(${devices.osName}) != 'macos' AND ${runs.harnessVersion} < '0.1.19')
                  THEN ${trials.peakRssMb}
                END),
                COALESCE(NULLIF(MIN(${modelsInfo.fileSizeBytes}), 0), ${models.fileSizeBytes})
                  / (1024.0 * 1024.0) + 512.0
              ) / (MIN(${devices.ramGb}) * 716.8))
          ELSE
            0.65 * (CASE
              WHEN AVG(${trials.decodeTps}) >= 100 THEN 1.0
              WHEN AVG(${trials.decodeTps}) >= 40  THEN 0.8 + 0.2 * (AVG(${trials.decodeTps}) - 40) / 60.0
              WHEN AVG(${trials.decodeTps}) >= 20  THEN 0.6 + 0.2 * (AVG(${trials.decodeTps}) - 20) / 20.0
              WHEN AVG(${trials.decodeTps}) >= 10  THEN 0.4 + 0.2 * (AVG(${trials.decodeTps}) - 10) / 10.0
              WHEN AVG(${trials.decodeTps}) >= 5   THEN 0.2 + 0.2 * (AVG(${trials.decodeTps}) - 5) / 5.0
              ELSE 0.2 * AVG(${trials.decodeTps}) / 5.0
            END)
            + 0.35 * (CASE
              WHEN AVG(${trials.prefillTps}) >= 4000 THEN 1.0
              WHEN AVG(${trials.prefillTps}) >= 2000 THEN 0.8 + 0.2 * (AVG(${trials.prefillTps}) - 2000) / 2000.0
              WHEN AVG(${trials.prefillTps}) >= 1000 THEN 0.6 + 0.2 * (AVG(${trials.prefillTps}) - 1000) / 1000.0
              WHEN AVG(${trials.prefillTps}) >= 500  THEN 0.4 + 0.2 * (AVG(${trials.prefillTps}) - 500) / 500.0
              WHEN AVG(${trials.prefillTps}) >= 200  THEN 0.2 + 0.2 * (AVG(${trials.prefillTps}) - 200) / 300.0
              ELSE 0.2 * AVG(${trials.prefillTps}) / 200.0
            END)
          END
        )`.as('composite_score'),
      })
      .from(trials)
      .innerJoin(runs, eq(trials.runId, runs.id))
      .innerJoin(models, eq(runs.modelId, models.id))
      .innerJoin(devices, eq(runs.deviceId, devices.id))
      .leftJoin(modelsInfo, eq(models.artifactSha256, modelsInfo.artifactSha256))
      .where(
        and(
          eq(runs.status, RunStatus.VERIFIED),
          eq(trials.inputTokens, 4096),
          eq(trials.outputTokens, 1024),
        ),
      )
      .groupBy(models.id, devices.chipId),
);

// -----------------------------------------------------------------------------
// Rewards
// -----------------------------------------------------------------------------

export const rewards = pgTable(
  'rewards',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `rwd_${crypto.randomUUID()}`),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    modelId: text('model_id')
      .notNull()
      .references(() => models.id),
    deviceChipId: text('device_chip_id').notNull(),
    did: text('did').notNull(),
    modelReward: real('model_reward').notNull(),
    deviceReward: real('device_reward').notNull(),
    totalReward: real('total_reward').notNull(),
    paymentRef: text('payment_ref'), // `${chainId}:${txHash}`
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('rewards_did_idx').on(t.did),
    index('rewards_model_idx').on(t.modelId),
    index('rewards_device_chip_idx').on(t.deviceChipId),
  ],
);

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const devicesRelations = relations(devices, ({ many }) => ({
  runs: many(runs),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  models: many(modelsInfo, { relationName: 'lab' }),
  quantizedModels: many(modelsInfo, { relationName: 'quantizedBy' }),
  families: many(modelFamilies),
}));

export const modelsRelations = relations(models, ({ one, many }) => ({
  runs: many(runs),
  info: one(modelsInfo, {
    fields: [models.artifactSha256],
    references: [modelsInfo.artifactSha256],
  }),
}));

export const modelFamiliesRelations = relations(modelFamilies, ({ one, many }) => ({
  org: one(organizations, { fields: [modelFamilies.orgId], references: [organizations.id] }),
  models: many(modelsInfo),
}));

export const modelsInfoRelations = relations(modelsInfo, ({ one }) => ({
  model: one(models, { fields: [modelsInfo.artifactSha256], references: [models.artifactSha256] }),
  lab: one(organizations, {
    fields: [modelsInfo.labId],
    references: [organizations.id],
    relationName: 'lab',
  }),
  quantizedBy: one(organizations, {
    fields: [modelsInfo.quantizedById],
    references: [organizations.id],
    relationName: 'quantizedBy',
  }),
  family: one(modelFamilies, { fields: [modelsInfo.familyId], references: [modelFamilies.id] }),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  device: one(devices, { fields: [runs.deviceId], references: [devices.id] }),
  model: one(models, { fields: [runs.modelId], references: [models.id] }),
  user: one(users, { fields: [runs.userId], references: [users.id] }),
  trials: many(trials),
}));

export const trialsRelations = relations(trials, ({ one }) => ({
  run: one(runs, { fields: [trials.runId], references: [runs.id] }),
}));

export const rewardsRelations = relations(rewards, ({ one }) => ({
  run: one(runs, { fields: [rewards.runId], references: [runs.id] }),
  model: one(models, { fields: [rewards.modelId], references: [models.id] }),
}));

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

// Tables
export type User = typeof users.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Model = typeof models.$inferSelect;
export type ModelFamily = typeof modelFamilies.$inferSelect;
export type ModelInfo = typeof modelsInfo.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Trial = typeof trials.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
// Views
export type ModelStatsByDevice = typeof view__model_stats_by_device.$inferSelect;
export type ModelDeviceSummary = typeof view__model_device_summary.$inferSelect;
