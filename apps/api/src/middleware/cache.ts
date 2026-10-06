import { createHash } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env.js';

export interface CacheOpts {
  maxAge: number;
  swr?: number;
}

/**
 * `Cache-Control: private, max-age=…, stale-while-revalidate=…` + ETag del
 * body. Si el cliente envía `If-None-Match` coincidente devolvemos 304
 * sin body.
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

/** Para endpoints de estado del user actual: una respuesta vieja = bug. */
export const noCache = createMiddleware<{ Bindings: Env; Variables: Record<string, unknown> }>(async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store, must-revalidate');
  c.res.headers.set('Pragma', 'no-cache');
});
