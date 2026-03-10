CREATE TYPE "public"."run_status" AS ENUM('pending', 'verified', 'flagged', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."scenario_id" AS ENUM('chat_short_v1', 'chat_long_v1');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'moderator', 'user');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"cpu" text NOT NULL,
	"gpu" text NOT NULL,
	"ram_gb" integer NOT NULL,
	"os_name" text NOT NULL,
	"os_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"format" text NOT NULL,
	"artifact_sha256" text NOT NULL,
	"tokenizer_sha256" text,
	"source" text,
	"file_size_bytes" integer,
	"parameters" text,
	"quant" text,
	"architecture" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "models_artifact_sha256_unique" UNIQUE("artifact_sha256")
);
--> statement-breakpoint
CREATE TABLE "nonces" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"bundle_id" text NOT NULL,
	"schema_version" text NOT NULL,
	"status" "run_status" DEFAULT 'verified' NOT NULL,
	"scenario_id" "scenario_id" NOT NULL,
	"task" text NOT NULL,
	"canonical" boolean NOT NULL,
	"notes" text,
	"device_id" text NOT NULL,
	"model_id" text NOT NULL,
	"user_id" text,
	"nonce_verified" boolean DEFAULT false NOT NULL,
	"runtime_name" text NOT NULL,
	"runtime_version" text NOT NULL,
	"runtime_build_flags" text,
	"harness_version" text NOT NULL,
	"harness_git_sha" text NOT NULL,
	"context_length" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"ip_hash" text,
	"ttft_p50_ms" real NOT NULL,
	"ttft_p95_ms" real NOT NULL,
	"decode_tps_mean" real NOT NULL,
	"weighted_tps_mean" real NOT NULL,
	"idle_rss_mb" real NOT NULL,
	"peak_rss_mb" real NOT NULL,
	"trials_passed" integer NOT NULL,
	"trials_total" integer NOT NULL,
	"trials" jsonb NOT NULL,
	"bundle_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "runs_bundle_id_unique" UNIQUE("bundle_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "devices_dedup_idx" ON "devices" USING btree ("cpu","gpu","ram_gb","os_name","os_version");--> statement-breakpoint
CREATE INDEX "runs_leaderboard_idx" ON "runs" USING btree ("model_id","scenario_id","status","decode_tps_mean");--> statement-breakpoint
CREATE INDEX "runs_device_idx" ON "runs" USING btree ("device_id","scenario_id");--> statement-breakpoint
CREATE INDEX "runs_user_idx" ON "runs" USING btree ("user_id");