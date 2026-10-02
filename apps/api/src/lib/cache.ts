import { createHash } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { AuthVars } from '../auth/middleware.js';

/**
 * Cache HTTP para GET endpoints.
 *
 * - `Cache-Control: private, max-age, stale-while-revalidate` → el browser
 *   usa la respuesta cacheada, y en segundo plano la revalida.
 * - `ETag` sobre el hash del body → el browser envía `If-None-Match` y si
 *   el ETag coincide respondemos 304 (ahorra ancho de banda, no CPU).
 *
 * No usar en endpoints con datos muy dinámicos (sesión, counters en vivo)
 * ni donde una respuesta vieja cause bugs (publicación cross-tab, etc.).
 */

export interface CacheOpts {
  /** Segundos que el browser puede usar la respuesta sin revalidar. */
  maxAge: number;
  /** Segundos extras durante los cuales puede usar la respuesta STALE
   *  mientras revalida en segundo plano. */
  swr?: number;
}

/**
 * Middleware post-handler: añade Cache-Control y ETag, y responde 304 si
 * el cliente ya tenía la última versión.
 */
export function cacheHeaders(opts: CacheOpts) {
  const { maxAge, swr = 0 } = opts;
  const cc = swr > 0
    ? `private, max-age=${maxAge}, stale-while-revalidate=${swr}`
    : `private, max-age=${maxAge}`;

  return createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
    await next();
    if (c.req.method !== 'GET') return;
    if (c.res.status !== 200) return;

    // Clonar la respuesta para hashear el body sin consumir el stream original.
    const body = await c.res.clone().text();
    const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;

    const ifNoneMatch = c.req.header('if-none-match');
    if (ifNoneMatch === etag) {
      // 304 sin body — ahorra ancho de banda.
      c.res = new Response(null, {
        status: 304,
        headers: { 'Cache-Control': cc, ETag: etag }
      });
      return;
    }

    c.res.headers.set('Cache-Control', cc);
    c.res.headers.set('ETag', etag);
  });
}

/** No cachear nunca — para endpoints de auth/session. */
export const noCache = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store, must-revalidate');
  c.res.headers.set('Pragma', 'no-cache');
});
