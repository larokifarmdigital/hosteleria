import { Hono } from 'hono';
import { z } from 'zod';
import { validate } from '../validate.js';
import { requireAuth, requireRestaurant } from '../middleware/authMiddleware.js';
import { i18nSchema } from '../schemas.js';
import { LEGAL_PAGE_TYPES, type LegalPage } from '../../../domain/models/legalPage.js';
import type { AppBindings } from '../types.js';

function legalPageToDto(p: LegalPage) {
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    content: p.content,
    lastUpdated: p.lastUpdated,
    updatedAt: p.updatedAt.toISOString()
  };
}

const typeParamSchema = z.object({ type: z.enum(LEGAL_PAGE_TYPES) });

const saveSchema = z.object({
  title: i18nSchema,
  // Markdown. 60 000 caracteres por idioma cubren de sobra una política de privacidad.
  content: z.record(z.string().max(60_000)),
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'formato AAAA-MM-DD').nullable().default(null)
});

/** Montadas en `/restaurants/:slug/legal-pages`. */
export function createLegalPagesRoutes() {
  const app = new Hono<AppBindings>();

  app.use('*', requireAuth);
  app.use('*', requireRestaurant('slug'));

  app.get('/', async (c) => {
    const pages = await c.get('container').legalPages.list.execute(c.req.param('slug')!);
    return c.json({ legalPages: pages.map(legalPageToDto) });
  });

  app.put('/:type', validate('param', typeParamSchema), validate('json', saveSchema), async (c) => {
    const page = await c.get('container').legalPages.save.execute(
      c.req.param('slug')!, c.req.valid('param').type, c.req.valid('json'), c.get('user')!.id
    );
    return c.json({ legalPage: legalPageToDto(page) });
  });

  app.delete('/:type', validate('param', typeParamSchema), async (c) => {
    await c.get('container').legalPages.delete.execute(c.req.param('slug')!, c.req.valid('param').type);
    return c.json({ ok: true });
  });

  return app;
}
