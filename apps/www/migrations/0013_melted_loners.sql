DROP INDEX "devices_dedup_idx";--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cpu_cores" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "gpu_cores" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "devices_dedup_idx" ON "devices" USING btree ("cpu","cpu_cores","gpu","gpu_cores","ram_gb","os_name","os_version");