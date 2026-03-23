import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { enumToPgEnum } from '@/lib/utils';

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
    cpuCores: integer('cpu_cores').notNull().default(0),
    gpu: text('gpu').notNull(),
    gpuCores: integer('gpu_cores').notNull().default(0),
    ramGb: integer('ram_gb').notNull(),
    osName: text('os_name').notNull(),
    osVersion: text('os_version').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('devices_dedup_idx').on(t.cpu, t.cpuCores, t.gpu, t.gpuCores, t.ramGb, t.osName, t.osVersion)],
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
    schemaVersion: text('schema_version').notNull(),
    status: runStatusEnum('status').notNull().default(RunStatus.VERIFIED),
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
    weightedTpsMean: real('weighted_tps_mean').notNull(),
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
    weightedTps: real('weighted_tps').notNull(),
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
// Relations
// -----------------------------------------------------------------------------

export const devicesRelations = relations(devices, ({ many }) => ({
  runs: many(runs),
}));

export const modelsRelations = relations(models, ({ many }) => ({
  runs: many(runs),
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

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Trial = typeof trials.$inferSelect;
