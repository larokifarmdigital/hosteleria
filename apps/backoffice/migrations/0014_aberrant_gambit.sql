CREATE TABLE IF NOT EXISTS "published_sites" (
	"restaurant_id" text PRIMARY KEY NOT NULL,
	"sources" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "published_sites" ADD CONSTRAINT "published_sites_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
