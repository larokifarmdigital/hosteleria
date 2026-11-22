import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { mediaUsageEnum } from './enums';
import { i18nString } from './i18n';
import { restaurants } from './content';
import { users } from './auth';

/** 1 fila = 1 objeto en R2. `usage` arranca en `unused` y cambia al asignarse
 *  el asset a un campo. La fila nace al pedir la URL de subida, antes de que
 *  exista el objeto: `confirmedAt` null = subida sin terminar. */
export const mediaAssets = pgTable('media_assets', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  r2Key: text('r2_key').notNull().unique(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true })
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
