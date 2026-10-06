import { createMiddleware } from 'hono/factory';
import { buildContainer } from '../compositionRoot.js';
import type { AppBindings } from '../types.js';

/**
 * Construye el `container` por request y lo setea en `c.get('container')`.
 *
 * Las rutas thin NO importan adapters ni UCs — solo tocan el container.
 * Esto permite que el día que haya que cambiar un adapter (p.ej. para
 * tests con mocks), solo se cambia `buildContainer`.
 */
export const withContainer = createMiddleware<AppBindings>(async (c, next) => {
  c.set('container', buildContainer(c.env));
  await next();
});
