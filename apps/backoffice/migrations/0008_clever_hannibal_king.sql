DO $$ BEGIN
 ALTER TABLE "dishes" ADD CONSTRAINT "dishes_image_asset_id_media_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
