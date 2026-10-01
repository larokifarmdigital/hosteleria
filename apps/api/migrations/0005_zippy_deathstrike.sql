ALTER TABLE "dishes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dishes" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "wines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "wines" ADD COLUMN "updated_by" text;