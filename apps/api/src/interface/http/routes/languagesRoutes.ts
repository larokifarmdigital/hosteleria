import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { cacheHeaders } from '../../../middleware/cache.js';
import type { AppBindings } from '../types.js';

/**
 * Rutas thin de idiomas. GET es pública para cualquier user autenticado;
 * mutaciones son admin only.
 */
export function createLanguagesRoutes() {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);

  app.get('/', cacheHeaders({ maxAge: 60, swr: 300 }), async (c) => {
    const list = await c.get('container').languages.list.execute();
    return c.json({
      languages: list.map(({ language, usedByCount }) => ({
        id: language.id,
        code: language.code,
        name: language.name,
        usedByCount
      }))
    });
  });

  app.post('/', requireAdmin, zValidator('json', createSchema), async (c) => {
    const lang = await c.get('container').languages.create.execute(c.req.valid('json'));
    return c.json({ language: { id: lang.id, code: lang.code, name: lang.name, usedByCount: 0 } }, 201);
  });

  app.patch('/:id', requireAdmin, zValidator('json', patchSchema), async (c) => {
    const id = c.req.param('id');
    await c.get('container').languages.update.execute(id, c.req.valid('json'));
    const updated = await c.get('container').repos.languagesRepo.findById(id);
    return c.json({ language: updated });
  });

  app.delete('/:id', requireAdmin, async (c) => {
    await c.get('container').languages.delete.execute(c.req.param('id'));
    return c.json({ ok: true });
  });

  return app;
}

const createSchema = z.object({
  code: z.string().min(2).max(5).regex(/^[a-z]{2}(-[a-z]{2})?$/, 'ISO 639-1 minúsculas'),
  name: z.string().min(1).max(60)
});

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional()
});
