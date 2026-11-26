// `publishedSnapshot` guarda la versión publicada para que `/discard` pueda
// restaurarla.
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
import { publishStateEnum, spaceTypeEnum, weekDayEnum } from './enums';
import { i18nString, i18nText, type I18nValue } from './i18n';
import { userRestaurants } from './auth';
import { mediaAssets } from './media';

export const languages = pgTable('languages', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

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
type SeoJson = { title?: I18nValue; description?: I18nValue; imageAssetId?: string };

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
  /** IANA timezone (ej. 'Europe/Madrid'). */
  timezone: text('timezone').notNull().default('Europe/Madrid'),
  /** Deploy hook de la landing: al publicar, el api le hace POST
   *  (fire-and-forget) para que se rebuildee. */
  rebuildHookUrl: text('rebuild_hook_url'),
  address: jsonb('address').$type<AddressJson>().default({}),
  contact: jsonb('contact').$type<ContactJson>().default({}),
  socials: jsonb('socials').$type<SocialsJson>().default({}),
  seo: jsonb('seo').$type<SeoJson>().default({}),
  // Las formas de estos jsonb están en `domain/models/restaurant.ts`.
  foundedYear: integer('founded_year'),
  branding: jsonb('branding').default({}),
  homeBlocks: jsonb('home_blocks').default([]),
  about: jsonb('about').default({}),
  groups: jsonb('groups').default({}),
  mapUrl: text('map_url'),
  showReviews: boolean('show_reviews').notNull().default(false),
  uiTexts: jsonb('ui_texts').default({}),
  faq: jsonb('faq').default({}),
  aiSummary: i18nText('ai_summary'),
  analyticsToken: text('analytics_token'),
  business: jsonb('business').default({}),
  lastPublishedAt: timestamp('last_published_at', { withTimezone: true }),
  // Última vez que se pidió regenerar la web, y si el hook la aceptó.
  lastRebuildAt: timestamp('last_rebuild_at', { withTimezone: true }),
  lastRebuildOk: boolean('last_rebuild_ok'),
  publishedSnapshot: jsonb('published_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by')
});

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
    gallery: jsonb('gallery').$type<string[]>().default([]),
    scheduleTexts: jsonb('schedule_texts').default({}),
    address: jsonb('address').$type<AddressJson>().default({}),
    mapUrl: text('map_url'),
    bookingContact: jsonb('booking_contact').default({}),
    publishedSnapshot: jsonb('published_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text('updated_by')
  },
  (t) => ({
    // Slug único por restaurante, no global.
    slugPerRestaurant: unique('spaces_slug_per_restaurant').on(t.restaurantId, t.slug),
    restaurantIdx: index('spaces_restaurant_idx').on(t.restaurantId)
  })
);

/** Un espacio puede tener varios turnos por día. */
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

/** Aviso legal, privacidad y cookies. Como la carta, no tienen borrador. */
export const legalPages = pgTable(
  'legal_pages',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    restaurantId: text('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'legal-notice' | 'privacy' | 'cookies'
    title: i18nString('title'),
    /** Markdown por idioma. */
    content: i18nText('content'),
    lastUpdated: text('last_updated'), // "YYYY-MM-DD"
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text('updated_by')
  },
  (t) => ({
    typePerRestaurant: unique('legal_pages_type_per_restaurant').on(t.restaurantId, t.type)
  })
);

export const dishCategories = pgTable('dish_categories', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => spaces.id, { onDelete: 'cascade' }),
  name: i18nString('name').notNull(),
  order: integer('order').notNull().default(0),
  // Platos y bebidas comparten tablas: la categoría dice de qué carta es.
  kind: text('kind', { enum: ['dish', 'drink'] }).notNull().default('dish')
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
  // ON DELETE SET NULL: al borrar el asset el plato queda sin foto.
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
  name: text('name').notNull(), // No i18n: nombre propio.
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

/**
 * Lo que la web enseña: una copia de las filas tal como estaban al pulsar «Publicar»
 * (ficha y espacios con su snapshot, carta con lo oculto, vinos, legales y fotos usadas).
 * La lectura pública construye la web desde aquí; las tablas de arriba son el borrador.
 */
export const publishedSites = pgTable('published_sites', {
  restaurantId: text('restaurant_id')
    .primaryKey()
    .references(() => restaurants.id, { onDelete: 'cascade' }),
  sources: jsonb('sources').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  publishedBy: text('published_by')
});
