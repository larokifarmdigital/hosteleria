import { and, eq, lt, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getDb } from '../db/client';
import { rateLimits } from '../db/schema/rate_limits';
import type { AuthVars } from '../auth/middleware';

export interface RateLimitOpts {
  /** Nombre de bucket (ej. 'auth-login', 'global'). */
  bucket: string;
  /** Máximo de requests permitidas en la ventana. */
  limit: number;
  /** Ventana en segundos. */
  windowSeconds: number;
  /** Función que extrae la key (default: IP del request). Puede ser async. */
  keyFn?: (c: any) => string | Promise<string>;
}

/**
 * Extrae la IP real del request (soporta proxies Vercel/CF).
 */
function getClientIp(c: any): string {
  const h = c.req.header('x-forwarded-for')
    ?? c.req.header('x-real-ip')
    ?? c.req.header('cf-connecting-ip')
    ?? 'unknown';
  return h.split(',')[0].trim();
}

/**
 * Middleware de rate limit sobre Postgres (sin dep externa).
 *
 * Algoritmo: fixed window. Al llegar un request, buscamos la fila
 * `(bucket, key)`. Si no existe o la ventana expiró, insertamos/reseteamos
 * con count=1. Si existe y el counter está dentro, incrementamos.
 * Si está encima del límite, 429.
 *
 * Overhead: 1 round-trip Neon (upsert con returning). ~15-30ms.
 */
export function rateLimit(opts: RateLimitOpts) {
  const { bucket, limit, windowSeconds, keyFn = getClientIp } = opts;

  return createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
    const env = c.get('env');
    const key = await keyFn(c);
    const db = getDb(env.DATABASE_URL);
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
      throw new HTTPException(429, { message: 'rate_limit_exceeded' });
    }

    await next();
  });
}

/**
 * Limpieza manual de filas antiguas. Llamar desde el cron de cleanup.
 */
export async function cleanupStaleRateLimits(env: { DATABASE_URL: string }) {
  const db = getDb(env.DATABASE_URL);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, sevenDaysAgo));
}
