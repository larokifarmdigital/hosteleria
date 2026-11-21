import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../types.js';

/**
 * Tras una escritura que ha ido bien, pide regenerar la landing si la ruta lo
 * marcó con `c.set('rebuild', …)`. Se espera a la llamada (como mucho 3 s): en
 * Workers, una petición lanzada sin esperar puede cortarse al enviar la respuesta.
 * Un fallo del hook no rompe la escritura, que ya está hecha.
 */
export const rebuildSiteAfterWrite = createMiddleware<AppBindings>(async (c, next) => {
  await next();
  const scope = c.get('rebuild');
  if (!scope || c.req.method === 'GET' || !c.res.ok) return;
  try {
    const rebuild = c.get('container').public.requestRebuild;
    if (scope.spaceId) await rebuild.forSpace(scope.spaceId);
    else if (scope.restaurantSlug) await rebuild.forRestaurant(scope.restaurantSlug);
  } catch (err) {
    console.error('[rebuild] no se pudo pedir el rebuild:', err instanceof Error ? err.message : err);
  }
});
