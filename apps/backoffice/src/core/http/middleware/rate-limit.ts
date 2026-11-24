import { lt, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getDb, getEnv } from '@/core/shared';
import { rateLimits } from '@/core/shared/infrastructure/drizzle/schema';
import { extractIp } from '../httpUtils';

// Fixed window sobre Postgres: 1 upsert a Neon por request (~15-30ms).

export interface RateLimitOpts {
  bucket: string;
  limit: number;
  windowSeconds: number;
  /** Default: IP. Login usa `IP:email` para evitar bombing cross-user. */
  keyFn?: (c: any) => string | Promise<string>;
}

export function getClientIp(c: any): string {
  return extractIp(c.req.raw.headers);
}

/** 429 + `Retry-After` al superar el límite; siempre emite `X-RateLimit-*`. */
export function rateLimit(opts: RateLimitOpts) {
  const { bucket, limit, windowSeconds, keyFn = getClientIp } = opts;

  return createMiddleware<{ Variables: Record<string, unknown> }>(async (c, next) => {
    const key = await keyFn(c);
    const db = getDb(getEnv().DATABASE_URL);
    const now = new Date();
    const windowStartCutoff = new Date(now.getTime() - windowSeconds * 1000);

    // Upsert atómico: si la fila existe y la ventana sigue válida, incrementa.
    // Si expiró o no existe, insert/reset con count=1.
    const [row] = await db
      .insert(rateLimits)
      .values({ bucket, key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: [rateLimits.bucket, rateLimits.key],
        set: {
          count: sql`CASE
            WHEN ${rateLimits.windowStart} < ${windowStartCutoff.toISOString()}::timestamptz
              THEN 1
            ELSE ${rateLimits.count} + 1
          END`,
          windowStart: sql`CASE
            WHEN ${rateLimits.windowStart} < ${windowStartCutoff.toISOString()}::timestamptz
              THEN ${now.toISOString()}::timestamptz
            ELSE ${rateLimits.windowStart}
          END`
        }
      })
      .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

    const remaining = Math.max(0, limit - row.count);
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.floor(row.windowStart.getTime() / 1000 + windowSeconds)));

    if (row.count > limit) {
      const retryAfter = Math.ceil((row.windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000);
      c.header('Retry-After', String(Math.max(1, retryAfter)));
      throw new HTTPException(429, { message: 'RATE_LIMITED' });
    }

    await next();
  });
}

/** Borra filas cuya ventana cerró hace >7 días; devuelve cuántas. */
export async function cleanupStaleRateLimits(): Promise<number> {
  const db = getDb(getEnv().DATABASE_URL);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, sevenDaysAgo))
    .returning({ key: rateLimits.key });
  return deleted.length;
}
