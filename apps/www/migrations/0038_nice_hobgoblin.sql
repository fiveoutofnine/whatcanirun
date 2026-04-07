ALTER TABLE "organizations" ALTER COLUMN "slug" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_unique" UNIQUE("slug");