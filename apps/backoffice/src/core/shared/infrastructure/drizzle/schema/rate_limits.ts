import { pgTable, text, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';

/** El middleware reinicia `windowStart` y `count` al expirar la ventana; el
 *  cron diario borra las filas con más de 7 días. */
export const rateLimits = pgTable('rate_limits', {
  bucket: text('bucket').notNull(),
  key: text('key').notNull(),
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow()
}, (t) => ({
  pk: primaryKey({ columns: [t.bucket, t.key] }),
  windowIdx: index('rate_limits_window_idx').on(t.windowStart)
}));
