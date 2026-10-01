import { pgTable, text, timestamp, primaryKey, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { userRoleEnum } from './enums';
import { restaurants } from './content';

/**
 * users — Cuentas del backoffice.
 *
 * `role`:
 *  - admin: acceso a todo, gestiona idiomas y usuarios
 *  - editor: solo restaurantes asignados en `user_restaurants`
 */
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('editor'),
  avatarColor: text('avatar_color').notNull().default('#b4593b'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastAccessAt: timestamp('last_access_at', { withTimezone: true })
});

/**
 * sessions — Requerido por Lucia. TTL manejado por Lucia (expiresAt).
 *
 * `userAgent` + `ipHash` + `createdAt` son extra para la vista
 * "sesiones activas" del usuario (GET /auth/sessions). No afectan a
 * Lucia (que solo lee id, userId, expiresAt).
 */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),  // SHA-256 de la IP — no guardamos IP cruda (GDPR)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  userIdx: index('sessions_user_idx').on(t.userId)
}));

/**
 * user_tokens — tokens de un solo uso para flows async por email:
 *  - `password_setup` → email de welcome al crear editor
 *  - `password_reset` → email de recuperación
 *
 * `tokenHash` guarda SHA-256 del token real (que viaja en el email).
 * El token nunca se guarda en claro — si alguien dumpa la BD no puede usar
 * tokens activos sin fuerza bruta sobre SHA-256.
 */
export const tokenKindEnum = pgEnum('token_kind', ['password_setup', 'password_reset']);

export const userTokens = pgTable('user_tokens', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: tokenKindEnum('kind').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  userIdx: index('user_tokens_user_idx').on(t.userId),
  expiresIdx: index('user_tokens_expires_idx').on(t.expiresAt)
}));

/**
 * user_restaurants — m2m. Un editor solo ve los restaurantes que
 * tenga aquí. Admins NO tienen filas (se resuelve por rol).
 */
export const userRestaurants = pgTable(
  'user_restaurants',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: text('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' })
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.restaurantId] })
  })
);

// ─── Relations ──────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  restaurants: many(userRestaurants)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const userRestaurantsRelations = relations(userRestaurants, ({ one }) => ({
  user: one(users, { fields: [userRestaurants.userId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [userRestaurants.restaurantId], references: [restaurants.id] })
}));
