import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { AppBindings } from '../types';

/**
 * Pide regenerar la landing. La petición queda apuntada antes de responder; el
 * aviso al proveedor, que puede tardar segundos, sale después si la app se montó
 * con `defer`. Sin él (pruebas) se espera a la llamada.
 */
export async function requestSiteRebuild(c: Context<AppBindings>, scope: { spaceId?: string; restaurantSlug?: string }): Promise<void> {
  const rebuild = c.get('container').public.requestRebuild;
  const pending = scope.spaceId
    ? await rebuild.prepareForSpace(scope.spaceId)
    : scope.restaurantSlug ? await rebuild.prepareForRestaurant(scope.restaurantSlug) : null;
  if (!pending) return;

  const defer = c.get('defer');
  if (!defer) return rebuild.deliver(pending);
  defer(() =>
    rebuild.deliver(pending)
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
