CREATE TABLE IF NOT EXISTS "legal_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"type" text NOT NULL,
	"title" jsonb DEFAULT '{}'::jsonb,
	"content" jsonb DEFAULT '{}'::jsonb,
	"last_updated" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "legal_pages_type_per_restaurant" UNIQUE("restaurant_id","type")
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "founded_year" integer;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "branding" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "home_blocks" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "about" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "groups" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "map_url" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "show_reviews" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "ui_texts" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "faq" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "ai_summary" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "analytics_token" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "business" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "schedule_texts" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "address" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "map_url" text;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "booking_contact" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "legal_pages" ADD CONSTRAINT "legal_pages_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
