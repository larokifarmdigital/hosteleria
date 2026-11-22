CREATE TABLE IF NOT EXISTS "rate_limits" (
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limits_bucket_key_pk" PRIMARY KEY("bucket","key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");