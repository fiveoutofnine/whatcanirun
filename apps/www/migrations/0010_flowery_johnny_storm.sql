DROP INDEX "trials_run_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "trials_run_trial_idx" ON "trials" USING btree ("run_id","trial_index");