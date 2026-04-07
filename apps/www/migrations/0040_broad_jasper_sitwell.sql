ALTER TABLE "model_families" ADD COLUMN "parameters" text;--> statement-breakpoint
ALTER TABLE "model_families" ADD COLUMN "quant" text;--> statement-breakpoint
ALTER TABLE "model_families" ADD COLUMN "architecture" text;--> statement-breakpoint
ALTER TABLE "model_families" ADD COLUMN "variant" text;--> statement-breakpoint
ALTER TABLE "model_families" ADD COLUMN "license" text;--> statement-breakpoint
ALTER TABLE "model_families" ADD COLUMN "release_date" timestamp;--> statement-breakpoint
ALTER TABLE "model_families" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "models_info" DROP COLUMN "variant";--> statement-breakpoint
ALTER TABLE "models_info" DROP COLUMN "license";--> statement-breakpoint
ALTER TABLE "models_info" DROP COLUMN "release_date";--> statement-breakpoint
ALTER TABLE "models_info" DROP COLUMN "tags";