DROP INDEX "runs_leaderboard_idx";--> statement-breakpoint
DROP INDEX "runs_device_idx";--> statement-breakpoint
CREATE INDEX "runs_leaderboard_idx" ON "runs" USING btree ("model_id","status","decode_tps_mean");--> statement-breakpoint
CREATE INDEX "runs_device_idx" ON "runs" USING btree ("device_id");--> statement-breakpoint
ALTER TABLE "runs" DROP COLUMN "scenario_id";--> statement-breakpoint
ALTER TABLE "runs" DROP COLUMN "task";--> statement-breakpoint
DROP TYPE "public"."scenario_id";