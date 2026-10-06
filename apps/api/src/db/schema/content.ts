/**
 * Schema del contenido de los restaurantes.
 *
 * Tablas:
 *  - `languages` + `restaurant_locales` — idiomas globales y qué locales
 *    tiene activo cada restaurante (m2m)
 *  - `restaurants` — ficha del local (JSON para address/contact/socials/seo)
 *  - `spaces` + `space_schedule` — salas del restaurante (hero + horarios)
 *  - `dish_categories` + `dishes` — carta de comida (name i18n)
 *  - `wine_categories` + `wines` — carta de vinos (name NO i18n)
 *
 * **i18n**: campos multiidioma guardan `{ es?, ca?, en?, ... }` como jsonb
 * (ver `./i18n.ts`).
 *
 * **Snapshots**: `publishedSnapshot` guarda la versión publicada para que
 * `/discard` pueda restaurar.
 */
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  primaryKey,
  index,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { publishStateEnum, spaceTypeEnum, weekDayEnum } from './enums.js';
import { i18nString, i18nText, type I18nValue } from './i18n.js';
import { userRestaurants } from './auth.js';
import { mediaAssets } from './media.js';

// ═════════════════════════════════════════════════════════════════
// Languages
// ═════════════════════════════════════════════════════════════════
export const languages = pgTable('languages', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  code: text('code').notNull().unique(), // ISO 639-1 ('es', 'ca', 'en'...)
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// ═════════════════════════════════════════════════════════════════
// Restaurants + i18n activo
// ═════════════════════════════════════════════════════════════════
type AddressJson = {
  street?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  district?: string;
  country?: string;
};
type ContactJson = { phone?: string; whatsapp?: string; email?: string; web?: string };
type SocialsJson = { instagram?: string; facebook?: string; tiktok?: string };
type SeoJson = { title?: I18nValue; description?: I18nValue };

export const restaurants = pgTable('restaurants', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  logoInitial: text('logo_initial').notNull().default(''),
  coverGradient: text('cover_gradient').notNull().default('var(--gradient-copper)'),
  state: publishStateEnum('state').notNull().default('draft'),
  defaultLocaleId: text('default_locale_id')
    .notNull()
    .references(() => languages.id, { onDelete: 'restrict' }),
  acceptsBookings: boolean('accepts_bookings').notNull().default(true),
  showSocials: boolean('show_socials').notNull().default(true),
  /** IANA timezone (ej. 'Europe/Madrid'). Afecta a "está abierto ahora",
   *  openingHoursSpecification en JSON-LD, llms.txt… */
  timezone: text('timezone').notNull().default('Europe/Madrid'),
  /** URL del "deploy hook" de la landing de este restaurante (Vercel,
   *  Cloudflare Pages, Netlify — cualquier plataforma con webhook de
   *  rebuild). Al publicar (state = 'published'), el api hace POST
   *  a esta URL (fire-and-forget) → la landing se rebuildea. */
  rebuildHookUrl: text('rebuild_hook_url'),
  address: jsonb('address').$type<AddressJson>().default({}),
  contact: jsonb('contact').$type<ContactJson>().default({}),
  socials: jsonb('socials').$type<SocialsJson>().default({}),
  seo: jsonb('seo').$type<SeoJson>().default({}),
  lastPublishedAt: timestamp('last_published_at', { withTimezone: true }),
  /** Snapshot del contenido en el momento de publicar — permite 'descartar
   *  cambios' volviendo al último publicado. */
  publishedSnapshot: jsonb('published_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  /** Último usuario que modificó el restaurante — audit ligero. */
  updatedBy: text('updated_by')
});

/** m2m — idiomas activos por restaurante */
export const restaurantLocales = pgTable(
  'restaurant_locales',
  {
    restaurantId: text('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    languageId: text('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'restrict' })
  },
  (t) => ({
    pk: primaryKey({ columns: [t.restaurantId, t.languageId] })
  })
);

// ═════════════════════════════════════════════════════════════════
// Spaces
// ═════════════════════════════════════════════════════════════════
type HeroJson = {
  title?: I18nValue;
  subtitle?: I18nValue;
  metaLeft?: I18nValue;
  metaRight?: I18nValue;
  note?: I18nValue;
  cta?: I18nValue;
  imageAlt?: I18nValue;
  imageAssetId?: string;
};
type ManifestoJson = { eyebrow?: I18nValue; text?: I18nValue };

export const spaces = pgTable(
  'spaces',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    restaurantId: text('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    type: spaceTypeEnum('type').notNull().default('restaurant'),
    isDefault: boolean('is_default').notNull().default(false),
    order: integer('order').notNull().default(0),
    state: publishStateEnum('state').notNull().default('draft'),
    coverGradient: text('cover_gradient').notNull().default('var(--gradient-copper)'),
    descriptor: text('descriptor').notNull().default(''),
    hero: jsonb('hero').$type<HeroJson>().default({}),
    manifesto: jsonb('manifesto').$type<ManifestoJson>().default({}),
    /** Snapshot del hero + manifesto al publicar. Permite discard. */
    publishedSnapshot: jsonb('published_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text('updated_by')
  },
  (t) => ({
    // slug único DENTRO de un restaurante — dos restaurantes pueden tener
    // ambos un espacio "comedor-principal".
    slugPerRestaurant: unique('spaces_slug_per_restaurant').on(t.restaurantId, t.slug),
    restaurantIdx: index('spaces_restaurant_idx').on(t.restaurantId)
  })
);

/** Turnos por día — un espacio puede tener varios turnos por día. */
export const spaceSchedule = pgTable('space_schedule', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  day: weekDayEnum('day').notNull(),
  open: text('open').notNull(),   // "HH:mm"
  close: text('close').notNull(), // "HH:mm"
  order: integer('order').notNull().default(0)
}, (t) => ({
  spaceDayIdx: index('space_schedule_space_day_idx').on(t.spaceId, t.day)
}));

// ═════════════════════════════════════════════════════════════════
// Menu — categorías + items (dishes/wines)
// ═════════════════════════════════════════════════════════════════
export const dishCategories = pgTable('dish_categories', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  name: i18nString('name').notNull(),
  order: integer('order').notNull().default(0)
});

export const dishes = pgTable('dishes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => dishCategories.id, { onDelete: 'restrict' }),
  name: i18nString('name').notNull(),
  note: i18nText('note'),
  price: numeric('price', { precision: 10, scale: 2 }),
  order: integer('order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  // FK a media_assets con ON DELETE SET NULL — si borras el asset, el
  // plato queda sin foto (en vez de con FK rota apuntando a nada).
  imageAssetId: text('image_asset_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
  imageGradient: text('image_gradient').notNull().default('var(--gradient-copper)'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by')
});

export const wineCategories = pgTable('wine_categories', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  name: i18nString('name').notNull(),
  order: integer('order').notNull().default(0)
});

export const wines = pgTable('wines', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => wineCategories.id, { onDelete: 'restrict' }),
  name: text('name').notNull(), // NO i18n — igual que en Sanity
  region: text('region'),
  note: i18nText('note'),
  priceGlass: numeric('price_glass', { precision: 10, scale: 2 }),
  priceBottle: numeric('price_bottle', { precision: 10, scale: 2 }),
  order: integer('order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  imageGradient: text('image_gradient').notNull().default('var(--gradient-copper)'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by')
});

// ═════════════════════════════════════════════════════════════════
// Relations
// ═════════════════════════════════════════════════════════════════
export const languagesRelations = relations(languages, ({ many }) => ({
  restaurantLocales: many(restaurantLocales)
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  defaultLocale: one(languages, {
    fields: [restaurants.defaultLocaleId],
    references: [languages.id]
  }),
  spaces: many(spaces),
  activeLocales: many(restaurantLocales),
  editors: many(userRestaurants)
}));

export const restaurantLocalesRelations = relations(restaurantLocales, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantLocales.restaurantId],
    references: [restaurants.id]
  }),
  language: one(languages, {
    fields: [restaurantLocales.languageId],
    references: [languages.id]
  })
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [spaces.restaurantId],
    references: [restaurants.id]
  }),
  schedule: many(spaceSchedule),
  dishCategories: many(dishCategories),
  dishes: many(dishes),
  wineCategories: many(wineCategories),
  wines: many(wines)
}));

export const spaceScheduleRelations = relations(spaceSchedule, ({ one }) => ({
  space: one(spaces, { fields: [spaceSchedule.spaceId], references: [spaces.id] })
}));

export const dishCategoriesRelations = relations(dishCategories, ({ one, many }) => ({
  space: one(spaces, { fields: [dishCategories.spaceId], references: [spaces.id] }),
  dishes: many(dishes)
}));

export const dishesRelations = relations(dishes, ({ one }) => ({
  space: one(spaces, { fields: [dishes.spaceId], references: [spaces.id] }),
  category: one(dishCategories, {
    fields: [dishes.categoryId],
    references: [dishCategories.id]
  })
}));

export const wineCategoriesRelations = relations(wineCategories, ({ one, many }) => ({
  space: one(spaces, { fields: [wineCategories.spaceId], references: [spaces.id] }),
  wines: many(wines)
}));

export const winesRelations = relations(wines, ({ one }) => ({
  space: one(spaces, { fields: [wines.spaceId], references: [spaces.id] }),
  category: one(wineCategories, {
    fields: [wines.categoryId],
    references: [wineCategories.id]
  })
}));
