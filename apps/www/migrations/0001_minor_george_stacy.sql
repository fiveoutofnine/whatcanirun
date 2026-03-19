CREATE TABLE "api_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text,
	"name" text NOT NULL,
	"code" text,
	"code_expires_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "api_tokens_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;