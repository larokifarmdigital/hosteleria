import { pgTable, text, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';

/**
 * Rate limit store simple sobre Postgres.
 *
 * Clave compuesta `bucket + key` (ej. 'auth-login' + '203.0.113.4').
 * `windowStart` marca el inicio de la ventana de conteo; cuando el middleware
 * ve que ya pasó la ventana, resetea el counter.
 *
 * Cleanup: no es necesario borrar filas viejas — el `windowStart` se actualiza
 * en cada reset. Un cron ocasional puede truncar las que lleven > 7 días.
 */
export const rateLimits = pgTable('rate_limits', {
  bucket: text('bucket').notNull(),
  key: text('key').notNull(),
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  pk: primaryKey({ columns: [t.bucket, t.key] }),
  windowIdx: index('rate_limits_window_idx').on(t.windowStart)
}));
