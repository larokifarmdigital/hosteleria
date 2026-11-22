ALTER TABLE "restaurants" ADD COLUMN "last_rebuild_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "last_rebuild_ok" boolean;