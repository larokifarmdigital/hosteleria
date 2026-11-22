import { pgTable, text, timestamp, primaryKey, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { userRoleEnum } from './enums.js';
import { restaurants } from './content.js';

/** admin: acceso a todo; editor: solo los restaurantes de `user_restaurants`. */
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('editor'),
  avatarColor: text('avatar_color').notNull().default('#b4593b'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastAccessAt: timestamp('last_access_at', { withTimezone: true }),
  // Cuenta suspendida: no puede iniciar sesión. Se conserva para poder reactivarla.
  suspendedAt: timestamp('suspended_at', { withTimezone: true })
});

/** Lucia solo lee id/userId/expiresAt; el resto alimenta GET /auth/sessions. */
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

/** Tokens de un solo uso. `tokenHash` = SHA-256 del token que viaja en el
 *  email; nunca en claro, para que un dump de la BD no dé tokens usables. */
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

/** Solo editores; los admins no tienen filas (se resuelve por rol). */
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
