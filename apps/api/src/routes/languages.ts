import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, count, asc } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { languages, restaurantLocales } from '../db/schema/content.js';
import { requireAuth, requireAdmin, type AuthVars } from '../auth/middleware.js';
import { cacheHeaders } from '../lib/cache.js';

const createSchema = z.object({
  code: z.string().min(2).max(5).regex(/^[a-z]{2}(-[a-z]{2})?$/, 'ISO 639-1 minúsculas'),
  name: z.string().min(1).max(60)
});

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional()
});

export function createLanguagesRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();

  app.use('*', requireAuth);

  // ─── GET / — devuelve con usedByCount ──────────────────────────
  app.get('/', cacheHeaders({ maxAge: 60, swr: 300 }), async (c) => {
    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);
    const rows = await db.query.languages.findMany({ orderBy: [asc(languages.name)] });
    const dtos = await Promise.all(rows.map(async (l) => {
      const [{ n }] = await db.select({ n: count() }).from(restaurantLocales).where(eq(restaurantLocales.languageId, l.id));
      return {
        id: l.id,
        code: l.code,
        name: l.name,
        usedByCount: Number(n)
      };
    }));
    return c.json({ languages: dtos });
  });

  // ─── POST / — admin only ───────────────────────────────────────
  app.post('/', requireAdmin, zValidator('json', createSchema), async (c) => {
    const env = c.get('env');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);
    const existing = await db.query.languages.findFirst({ where: eq(languages.code, body.code) });
    if (existing) throw new HTTPException(409, { message: 'code_taken' });
    const [row] = await db.insert(languages).values(body).returning();
    return c.json({ language: { ...row, usedByCount: 0 } }, 201);
  });

  // ─── PATCH /:id — admin only ───────────────────────────────────
  app.patch('/:id', requireAdmin, zValidator('json', patchSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.languages.findFirst({ where: eq(languages.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await db.update(languages).set(body).where(eq(languages.id, id));
    const updated = await db.query.languages.findFirst({ where: eq(languages.id, id) });
    return c.json({ language: updated });
  });

  // ─── DELETE /:id — admin only, solo si no está en uso ──────────
  app.delete('/:id', requireAdmin, async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const db = getDb(env.DATABASE_URL);
    const [{ n }] = await db.select({ n: count() }).from(restaurantLocales).where(eq(restaurantLocales.languageId, id));
    if (Number(n) > 0) throw new HTTPException(400, { message: 'language_in_use' });
    await db.delete(languages).where(eq(languages.id, id));
    return c.json({ ok: true });
  });

  return app;
}
