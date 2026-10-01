import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { mediaUsageEnum } from './enums';
import { i18nString } from './i18n';
import { restaurants } from './content';
import { users } from './auth';

/**
 * media_assets — Cada fila representa un objeto en el bucket R2.
 *
 * `r2Key` es la key completa dentro del bucket (ej. `casabella/2026/hero-01.webp`).
 * `usage` se calcula al asignar el asset (unused → hero/gallery/dish).
 */
export const mediaAssets = pgTable('media_assets', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),                    // "casabella-hero-01"
  r2Key: text('r2_key').notNull().unique(),        // path dentro del bucket
  mimeType: text('mime_type').notNull(),
  sizeKb: integer('size_kb').notNull(),
  width: integer('width'),
  height: integer('height'),
  usage: mediaUsageEnum('usage').notNull().default('unused'),
  hasAltText: boolean('has_alt_text').notNull().default(false),
  altText: i18nString('alt_text'),
  restaurantId: text('restaurant_id')
    .references(() => restaurants.id, { onDelete: 'set null' }),
  uploadedBy: text('uploaded_by')
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [mediaAssets.restaurantId],
    references: [restaurants.id]
  }),
  uploader: one(users, {
    fields: [mediaAssets.uploadedBy],
    references: [users.id]
  })
}));
