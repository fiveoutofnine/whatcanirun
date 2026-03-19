ALTER TABLE "nonces" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "nonces" CASCADE;--> statement-breakpoint
ALTER TABLE "runs" RENAME COLUMN "nonce_verified" TO "bundle_sha256";--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_bundle_sha256_unique" UNIQUE("bundle_sha256");