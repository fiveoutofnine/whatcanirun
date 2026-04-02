ALTER TABLE "organizations" DROP CONSTRAINT "organizations_slug_unique";--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "slug" SET DEFAULT 'replace';