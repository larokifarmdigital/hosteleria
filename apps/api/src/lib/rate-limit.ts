import { and, eq, lt, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getDb } from '../db/client.js';
import { rateLimits } from '../db/schema/rate_limits.js';
import type { Env } from '../env.js';
import type { AuthVars } from '../auth/middleware.js';

/**
 * Rate limiting sobre Postgres — anti-abuso para endpoints HTTP.
 *
 * Usa la tabla `rate_limits` (bucket + key + count + windowStart) con
 * algoritmo "fixed window". Guardamos un contador por combinación
 * (bucket, key); si supera `limit` en la ventana → 429.
 *
 * Overhead típico: ~15-30ms (1 upsert a Neon por request).
 */

export interface RateLimitOpts {
  /** Nombre lógico del bucket (ej. 'auth-login', 'global'). Separa contadores. */
  bucket: string;
  /** Cuántas requests acepta en la ventana antes de responder 429. */
  limit: number;
  /** Tamaño de la ventana en segundos. */
  windowSeconds: number;
  /** Cómo deriva la "key" por la que se cuenta. Default = IP del request.
   *  Login lo sobrescribe a `IP:email` para evitar bombing cross-user. */
  keyFn?: (c: any) => string | Promise<string>;
}

/**
 * Extrae la IP real del cliente leyendo los headers que inyecta Cloudflare
 * (`cf-connecting-ip`) o cualquier proxy delante. Devuelve 'unknown' si no
 * detecta nada.
 */
function getClientIp(c: any): string {
  const h = c.req.header('cf-connecting-ip')
    ?? c.req.header('x-forwarded-for')
    ?? c.req.header('x-real-ip')
    ?? 'unknown';
  return h.split(',')[0].trim();
}

/**
 * Factory de middleware. Devuelve un middleware que puede montarse en
 * cualquier ruta Hono.
 *
 * Dónde se usa:
 *  - `app.ts` → limiter global (100/min) salvo rutas públicas y /auth/*.
 *  - `routes/auth.ts` → login (5/hora por IP+email), forgot (3/hora).
 *
 * Comportamiento:
 *  - Incrementa el contador para `(bucket, key)` en 1.
 *  - Si pasa `limit` → `429 rate_limit_exceeded` + header `Retry-After`.
 *  - Siempre añade `X-RateLimit-Limit / Remaining / Reset` para que el
 *    cliente sepa cuánto le queda.
 */
export function rateLimit(opts: RateLimitOpts) {
  const { bucket, limit, windowSeconds, keyFn = getClientIp } = opts;

  return createMiddleware<{ Bindings: Env; Variables: AuthVars }>(async (c, next) => {
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
 * Borra filas viejas de `rate_limits` (ventana cerró hace >7 días).
 *
 * Dónde se usa:
 *  - `lib/cleanup.ts` → llamado desde el `scheduled` handler del Worker
 *    todos los días. Es gratis dejar filas viejas, pero ocupan espacio y
 *    ralentizan los upserts a la larga.
 *
 * Devuelve cuántas filas se borraron (útil para logs).
 */
export async function cleanupStaleRateLimits(env: Env): Promise<number> {
  const db = getDb(env.DATABASE_URL);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, sevenDaysAgo))
    .returning({ key: rateLimits.key });
  return deleted.length;
}
