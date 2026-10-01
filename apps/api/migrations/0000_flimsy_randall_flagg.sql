CREATE TYPE "public"."media_usage" AS ENUM('hero', 'gallery', 'dish', 'unused');--> statement-breakpoint
CREATE TYPE "public"."publish_state" AS ENUM('published', 'draft', 'warnings', 'new');--> statement-breakpoint
CREATE TYPE "public"."space_type" AS ENUM('restaurant', 'cafe', 'coctel', 'club', 'terraza', 'live_music', 'otro');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."week_day" AS ENUM('Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_restaurants" (
	"user_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	CONSTRAINT "user_restaurants_user_id_restaurant_id_pk" PRIMARY KEY("user_id","restaurant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"avatar_color" text DEFAULT '#b4593b' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_access_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dish_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"name" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dishes" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" jsonb DEFAULT '{}'::jsonb,
	"price" numeric(10, 2),
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"image_asset_id" text,
	"image_gradient" text DEFAULT 'var(--gradient-copper)' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "languages" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restaurant_locales" (
	"restaurant_id" text NOT NULL,
	"language_id" text NOT NULL,
	CONSTRAINT "restaurant_locales_restaurant_id_language_id_pk" PRIMARY KEY("restaurant_id","language_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restaurants" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"logo_initial" text DEFAULT '' NOT NULL,
	"cover_gradient" text DEFAULT 'var(--gradient-copper)' NOT NULL,
	"state" "publish_state" DEFAULT 'draft' NOT NULL,
	"default_locale_id" text NOT NULL,
	"accepts_bookings" boolean DEFAULT true NOT NULL,
	"show_socials" boolean DEFAULT true NOT NULL,
	"address" jsonb DEFAULT '{}'::jsonb,
	"contact" jsonb DEFAULT '{}'::jsonb,
	"socials" jsonb DEFAULT '{}'::jsonb,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"last_published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "space_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"day" "week_day" NOT NULL,
	"open" text NOT NULL,
	"close" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "space_type" DEFAULT 'restaurant' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"state" "publish_state" DEFAULT 'draft' NOT NULL,
	"cover_gradient" text DEFAULT 'var(--gradient-copper)' NOT NULL,
	"descriptor" text DEFAULT '' NOT NULL,
	"hero" jsonb DEFAULT '{}'::jsonb,
	"manifesto" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_slug_per_restaurant" UNIQUE("restaurant_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wine_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"name" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wines" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"note" jsonb DEFAULT '{}'::jsonb,
	"price_glass" numeric(10, 2),
	"price_bottle" numeric(10, 2),
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"image_gradient" text DEFAULT 'var(--gradient-copper)' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"r2_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_kb" integer NOT NULL,
	"width" integer,
	"height" integer,
	"usage" "media_usage" DEFAULT 'unused' NOT NULL,
	"has_alt_text" boolean DEFAULT false NOT NULL,
	"alt_text" jsonb DEFAULT '{}'::jsonb,
	"restaurant_id" text,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_r2_key_unique" UNIQUE("r2_key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_restaurants" ADD CONSTRAINT "user_restaurants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_restaurants" ADD CONSTRAINT "user_restaurants_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dish_categories" ADD CONSTRAINT "dish_categories_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dishes" ADD CONSTRAINT "dishes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dishes" ADD CONSTRAINT "dishes_category_id_dish_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."dish_categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restaurant_locales" ADD CONSTRAINT "restaurant_locales_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restaurant_locales" ADD CONSTRAINT "restaurant_locales_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_default_locale_id_languages_id_fk" FOREIGN KEY ("default_locale_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "space_schedule" ADD CONSTRAINT "space_schedule_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spaces" ADD CONSTRAINT "spaces_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wine_categories" ADD CONSTRAINT "wine_categories_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wines" ADD CONSTRAINT "wines_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wines" ADD CONSTRAINT "wines_category_id_wine_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."wine_categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "space_schedule_space_day_idx" ON "space_schedule" USING btree ("space_id","day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spaces_restaurant_idx" ON "spaces" USING btree ("restaurant_id");