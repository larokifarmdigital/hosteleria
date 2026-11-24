ALTER TABLE "media_assets" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
-- Lo que ya existía se da por confirmado: el cron solo limpia subidas nuevas sin terminar.
UPDATE "media_assets" SET "confirmed_at" = "created_at" WHERE "confirmed_at" IS NULL;
