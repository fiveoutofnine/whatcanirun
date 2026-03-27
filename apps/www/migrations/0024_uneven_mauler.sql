CREATE TABLE "models_info" (
	"artifact_sha256" text PRIMARY KEY NOT NULL,
	"lab_id" text,
	"quantized_by_id" text,
	"name" text,
	"file_size_bytes" bigint,
	"parameters" text,
	"quant" text,
	"architecture" text,
	"variant" text,
	"license" text,
	"release_date" timestamp,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "models_info" ADD CONSTRAINT "models_info_artifact_sha256_models_artifact_sha256_fk" FOREIGN KEY ("artifact_sha256") REFERENCES "public"."models"("artifact_sha256") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models_info" ADD CONSTRAINT "models_info_lab_id_organizations_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models_info" ADD CONSTRAINT "models_info_quantized_by_id_organizations_id_fk" FOREIGN KEY ("quantized_by_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;