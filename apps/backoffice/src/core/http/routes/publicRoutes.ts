import { Hono } from 'hono';
import { cacheHeaders } from '../../../middleware/cache.js';
import type { AppBindings } from '../types.js';

/**
 * Lectura pública, sin sesión: lo que una landing necesita para construirse.
 * Solo sale lo publicado. Montadas en `/public`.
 */
export function createPublicRoutes() {
  const app = new Hono<AppBindings>();

  // Siempre se revalida: el build que sigue a publicar no puede recibir una
  // copia vieja. Con ETag, si nada cambió la respuesta es un 304 sin cuerpo.
  app.use('*', cacheHeaders({ maxAge: 0, scope: 'public' }));

  app.get('/restaurants/:slug', async (c) => {
    const site = await c.get('container').public.getSite.execute(c.req.param('slug'));
    return c.json(site);
  });

  return app;
}
