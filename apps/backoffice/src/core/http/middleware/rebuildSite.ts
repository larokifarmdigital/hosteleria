import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { runWithRequestDb } from '@/core/shared';
import type { AppBindings } from '../types';

/**
 * Pide regenerar la landing. La petición queda apuntada antes de responder; el
 * aviso al proveedor, que puede tardar segundos, sale después (`waitUntil`) y con
 * su propia conexión: la de esta petición se cierra al responder.
 */
export async function requestSiteRebuild(c: Context<AppBindings>, scope: { spaceId?: string; restaurantSlug?: string }): Promise<void> {
  const rebuild = c.get('container').public.requestRebuild;
  const pending = scope.spaceId
    ? await rebuild.prepareForSpace(scope.spaceId)
    : scope.restaurantSlug ? await rebuild.prepareForRestaurant(scope.restaurantSlug) : null;
  if (!pending) return;

  // Fuera de Workers (tests) no hay `executionCtx`: se espera a la llamada.
  let waitUntil: ((p: Promise<unknown>) => void) | null = null;
  try {
    const ctx = c.executionCtx;
    waitUntil = p => ctx.waitUntil(p);
  } catch {
    waitUntil = null;
  }
  if (!waitUntil) return rebuild.deliver(pending);
  const later = waitUntil;
  later(
    runWithRequestDb(c.env.DATABASE_URL, later, () => rebuild.deliver(pending))
      .catch(err => console.error('[rebuild] no se pudo avisar a la web:', err instanceof Error ? err.message : err))
  );
}

/**
 * Tras una escritura que ha ido bien, pide regenerar la landing si la ruta lo
 * marcó con `c.set('rebuild', …)`. Un fallo aquí no rompe la escritura, que ya está hecha.
 */
export const rebuildSiteAfterWrite = createMiddleware<AppBindings>(async (c, next) => {
  await next();
  const scope = c.get('rebuild');
  if (!scope || c.req.method === 'GET' || !c.res.ok) return;
  try {
    await requestSiteRebuild(c, scope);
  } catch (err) {
    console.error('[rebuild] no se pudo pedir el rebuild:', err instanceof Error ? err.message : err);
  }
});
