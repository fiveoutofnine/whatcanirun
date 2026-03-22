CREATE TABLE "trials" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"trial_index" integer NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"ttft_ms" real NOT NULL,
	"total_ms" real NOT NULL,
	"prefill_tps" real NOT NULL,
	"decode_tps" real NOT NULL,
	"weighted_tps" real NOT NULL,
	"idle_rss_mb" real NOT NULL,
	"peak_rss_mb" real NOT NULL,
	"exit_status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trials_run_idx" ON "trials" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "trials_decode_tps_idx" ON "trials" USING btree ("decode_tps");--> statement-breakpoint
CREATE INDEX "trials_ttft_idx" ON "trials" USING btree ("ttft_ms");