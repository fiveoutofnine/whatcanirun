CREATE TABLE "rewards" (
	"id" text PRIMARY KEY NOT NULL,
	"did" text NOT NULL,
	"run_id" text NOT NULL,
	"model_id" text NOT NULL,
	"device_chip_id" text NOT NULL,
	"model_reward" real NOT NULL,
	"device_reward" real NOT NULL,
	"total_reward" real NOT NULL,
	"payment_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rewards_did_idx" ON "rewards" USING btree ("did");--> statement-breakpoint
CREATE INDEX "rewards_model_idx" ON "rewards" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "rewards_device_chip_idx" ON "rewards" USING btree ("device_chip_id");