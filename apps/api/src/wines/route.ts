/**
 * Rutas HTTP de vinos y categorías de vinos.
 *
 * **Endpoints**:
 *  - `GET  /wines`                   — listado filtrable por restaurante/categoría
 *  - `POST /wines`                   — crear vino
 *  - `PATCH /wines/:id`              — editar
 *  - `DELETE /wines/:id`             — borrar
 *  - `GET  /wines/categories`        — listado de categorías
 *  - `POST /wines/categories`        — crear categoría
 *  - `DELETE /wines/categories/:id`  — borrar (restrict si tiene vinos)
 *
 * Diferencias vs. dishes:
 *  - `wine.name` NO es i18n (los vinos son nombres propios).
 *  - `wine.region` opcional, `priceGlass` + `priceBottle` por separado.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { restaurants, spaces, wineCategories, wines } from '../db/schema/content.js';
import { userRestaurants } from '../db/schema/auth.js';
import { requireAuth, type AuthVars } from '../auth/middleware.js';

const i18nSchema = z.record(z.string());

const categoryCreateSchema = z.object({
  spaceId: z.string().min(1),
  name: i18nSchema,
  order: z.number().int().min(0).default(0)
});
const categoryPatchSchema = z.object({
  name: i18nSchema.optional(),
  order: z.number().int().min(0).optional()
}).partial();

const wineCreateSchema = z.object({
  spaceId: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1).max(200), // NO i18n en el schema Sanity original
  region: z.string().max(200).optional(),
  note: i18nSchema.optional(),
  priceGlass: z.number().nonnegative().optional(),
  priceBottle: z.number().nonnegative().optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  imageGradient: z.string().optional()
});

const winePatchSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  region: z.string().max(200).nullable().optional(),
  note: i18nSchema.optional(),
  priceGlass: z.number().nonnegative().nullable().optional(),
  priceBottle: z.number().nonnegative().nullable().optional(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  imageGradient: z.string().optional()
}).partial();

async function allowedSpaceIds(c: any): Promise<Set<string> | null> {
  const env = c.get('env');
  const user = c.get('user')!;
  const db = getDb(env.DATABASE_URL);
  if (user.role === 'admin') return null;
  const rRows = await db.select({ restaurantId: userRestaurants.restaurantId })
    .from(userRestaurants)
    .where(eq(userRestaurants.userId, user.id));
  const rIds = rRows.map(r => r.restaurantId);
  if (rIds.length === 0) return new Set();
  const sRows = await db.select({ id: spaces.id }).from(spaces).where(inArray(spaces.restaurantId, rIds));
  return new Set(sRows.map(s => s.id));
}

async function checkSpaceAccess(c: any, spaceId: string) {
  const allowed = await allowedSpaceIds(c);
  if (allowed === null) return;
  if (!allowed.has(spaceId)) throw new HTTPException(403, { message: 'space_forbidden' });
}

async function toWineDto(env: any, id: string) {
  const db = getDb(env.DATABASE_URL);
  const row = await db.query.wines.findFirst({
    where: eq(wines.id, id),
    with: {
      category: true,
      space: { with: { restaurant: true } }
    }
  });
  if (!row) return null;
  const localesFilled = Object.entries(row.note ?? {})
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
  return {
    id: row.id,
    spaceId: row.spaceId,
    categoryId: row.categoryId,
    restaurantSlug: row.space.restaurant.slug,
    restaurantName: row.space.restaurant.name,
    categoryName: (row.category.name as Record<string, string>)?.es ?? '',
    name: row.name,
    region: row.region,
    note: row.note ?? {},
    priceGlass: row.priceGlass !== null ? Number(row.priceGlass) : null,
    priceBottle: row.priceBottle !== null ? Number(row.priceBottle) : null,
    order: row.order,
    active: row.active,
    localesFilled,
    imageGradient: row.imageGradient
  };
}

export function createWinesRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();
  app.use('*', requireAuth);

  // ─── CATEGORIES ────────────────────────────────────────────────
  const cats = new Hono<{ Variables: AuthVars }>();

  cats.get('/', async (c) => {
    const env = c.get('env');
    const spaceId = c.req.query('spaceId');
    const db = getDb(env.DATABASE_URL);
    const allowed = await allowedSpaceIds(c);
    let rows;
    if (spaceId) {
      if (allowed && !allowed.has(spaceId)) throw new HTTPException(403, { message: 'space_forbidden' });
      rows = await db.query.wineCategories.findMany({
        where: eq(wineCategories.spaceId, spaceId),
        orderBy: [asc(wineCategories.order)]
      });
    } else {
      rows = await db.query.wineCategories.findMany({ orderBy: [asc(wineCategories.order)] });
      if (allowed) rows = rows.filter(r => allowed.has(r.spaceId));
    }
    return c.json({ categories: rows });
  });

  cats.post('/', zValidator('json', categoryCreateSchema), async (c) => {
    const env = c.get('env');
    const body = c.req.valid('json');
    await checkSpaceAccess(c, body.spaceId);
    const db = getDb(env.DATABASE_URL);
    const [row] = await db.insert(wineCategories).values({
      spaceId: body.spaceId, name: body.name, order: body.order
    }).returning();
    return c.json({ category: row }, 201);
  });

  cats.patch('/:id', zValidator('json', categoryPatchSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.wineCategories.findFirst({ where: eq(wineCategories.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    await db.update(wineCategories).set(body).where(eq(wineCategories.id, id));
    const updated = await db.query.wineCategories.findFirst({ where: eq(wineCategories.id, id) });
    return c.json({ category: updated });
  });

  cats.delete('/:id', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.wineCategories.findFirst({ where: eq(wineCategories.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    await db.delete(wineCategories).where(eq(wineCategories.id, id));
    return c.json({ ok: true });
  });

  app.route('/categories', cats);

  // ─── WINES ─────────────────────────────────────────────────────
  app.get('/', async (c) => {
    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);
    const allowed = await allowedSpaceIds(c);
    const restaurantSlug = c.req.query('restaurantSlug');
    const categoryId = c.req.query('categoryId');

    let spaceIdsFilter: string[] | null = null;
    if (restaurantSlug) {
      const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, restaurantSlug) });
      if (!r) return c.json({ wines: [] });
      const sRows = await db.select({ id: spaces.id }).from(spaces).where(eq(spaces.restaurantId, r.id));
      spaceIdsFilter = sRows.map(s => s.id);
    }
    if (allowed) {
      spaceIdsFilter = spaceIdsFilter ? spaceIdsFilter.filter(id => allowed.has(id)) : Array.from(allowed);
    }
    const conds = [];
    if (spaceIdsFilter) {
      if (spaceIdsFilter.length === 0) return c.json({ wines: [] });
      conds.push(inArray(wines.spaceId, spaceIdsFilter));
    }
    if (categoryId) conds.push(eq(wines.categoryId, categoryId));

    const rows = await db.query.wines.findMany({
      where: conds.length > 0 ? and(...conds) : undefined,
      orderBy: [asc(wines.order)]
    });
    const dtos = await Promise.all(rows.map(w => toWineDto(env, w.id)));
    return c.json({ wines: dtos.filter(Boolean) });
  });

  app.post('/', zValidator('json', wineCreateSchema), async (c) => {
    const env = c.get('env');
    const body = c.req.valid('json');
    await checkSpaceAccess(c, body.spaceId);
    const db = getDb(env.DATABASE_URL);
    const [row] = await db.insert(wines).values({
      spaceId: body.spaceId,
      categoryId: body.categoryId,
      name: body.name,
      region: body.region,
      note: body.note,
      priceGlass: body.priceGlass !== undefined ? String(body.priceGlass) : null,
      priceBottle: body.priceBottle !== undefined ? String(body.priceBottle) : null,
      order: body.order,
      active: body.active,
      imageGradient: body.imageGradient ?? 'var(--gradient-copper)'
    }).returning({ id: wines.id });
    const dto = await toWineDto(env, row.id);
    return c.json({ wine: dto }, 201);
  });

  app.patch('/:id', zValidator('json', winePatchSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.wines.findFirst({ where: eq(wines.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    const user = c.get('user')!;
    const updates: Partial<typeof wines.$inferInsert> = { updatedAt: new Date(), updatedBy: user.id };
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.name !== undefined) updates.name = body.name;
    if (body.region !== undefined) updates.region = body.region;
    if (body.note !== undefined) updates.note = body.note;
    if (body.priceGlass !== undefined) updates.priceGlass = body.priceGlass === null ? null : String(body.priceGlass);
    if (body.priceBottle !== undefined) updates.priceBottle = body.priceBottle === null ? null : String(body.priceBottle);
    if (body.order !== undefined) updates.order = body.order;
    if (body.active !== undefined) updates.active = body.active;
    if (body.imageGradient !== undefined) updates.imageGradient = body.imageGradient;
    await db.update(wines).set(updates).where(eq(wines.id, id));
    const dto = await toWineDto(env, id);
    return c.json({ wine: dto });
  });

  app.delete('/:id', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.wines.findFirst({ where: eq(wines.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    await db.delete(wines).where(eq(wines.id, id));
    return c.json({ ok: true });
  });

  return app;
}
