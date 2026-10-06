import { createHash } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env.js';

/**
 * Middlewares de caché HTTP.
 *
 * Dos piezas conviven:
 *  - `cacheHeaders({ maxAge, swr })` → cachea GET en el browser.
 *  - `noCache` → impide cachear (para endpoints sensibles de sesión).
 */

export interface CacheOpts {
  maxAge: number;
  swr?: number;
}

/**
 * Middleware para GET: el browser cachea la respuesta `maxAge` segundos
 * (y hasta `maxAge + swr` segundos la sirve mientras revalida en background).
 * Además emite un `ETag` del hash del body: si el cliente ya tiene esa
 * versión, respondemos **304 Not Modified** sin body.
 *
 * Dónde se usa:
 *  - `routes/languages.ts` → listado de idiomas (cambia poco, cache 60s).
 *  - `routes/restaurants.ts` → listado y detalle (cache 30s).
 */
export function cacheHeaders(opts: CacheOpts) {
  const { maxAge, swr = 0 } = opts;
  const cacheControl = swr > 0
    ? `private, max-age=${maxAge}, stale-while-revalidate=${swr}`
    : `private, max-age=${maxAge}`;

  return createMiddleware<{ Bindings: Env; Variables: Record<string, unknown> }>(async (c, next) => {
    await next();
    if (c.req.method !== 'GET' || c.res.status !== 200) return;

    const body = await c.res.clone().text();
    const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;

    if (c.req.header('if-none-match') === etag) {
      c.res = new Response(null, {
        status: 304,
        headers: { 'Cache-Control': cacheControl, ETag: etag }
      });
      return;
    }

    c.res.headers.set('Cache-Control', cacheControl);
    c.res.headers.set('ETag', etag);
  });
}

/**
 * Fuerza "no cachear". Para endpoints que devuelven estado sensible del
 * usuario actual, donde una respuesta vieja = bug.
 *
 * Dónde se usa:
 *  - `routes/auth.ts` → `GET /auth/session` y `GET /auth/sessions`.
 */
export const noCache = createMiddleware<{ Bindings: Env; Variables: Record<string, unknown> }>(async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store, must-revalidate');
  c.res.headers.set('Pragma', 'no-cache');
});
