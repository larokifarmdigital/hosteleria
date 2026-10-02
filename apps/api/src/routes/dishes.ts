import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { restaurants, spaces, dishCategories, dishes } from '../db/schema/content.js';
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

const dishCreateSchema = z.object({
  spaceId: z.string().min(1),
  categoryId: z.string().min(1),
  name: i18nSchema,
  note: i18nSchema.optional(),
  price: z.number().nonnegative().optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  imageAssetId: z.string().optional(),
  imageGradient: z.string().optional()
});

const dishPatchSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: i18nSchema.optional(),
  note: i18nSchema.optional(),
  price: z.number().nonnegative().nullable().optional(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  imageAssetId: z.string().nullable().optional(),
  imageGradient: z.string().optional()
}).partial();

/**
 * Devuelve los spaceIds a los que el usuario puede acceder.
 * Admin → todos; editor → solo los de sus restaurantes.
 */
async function allowedSpaceIds(c: any): Promise<Set<string> | null> {
  const env = c.get('env');
  const user = c.get('user')!;
  const db = getDb(env.DATABASE_URL);
  if (user.role === 'admin') return null; // sin restricción
  const rRows = await db
    .select({ restaurantId: userRestaurants.restaurantId })
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

/**
 * DTO enriquecido — añade restaurantSlug/Name y categoryName, como espera
 * la tabla del backoffice en /dishes.
 */
async function toDishDto(env: any, dishId: string) {
  const db = getDb(env.DATABASE_URL);
  const row = await db.query.dishes.findFirst({
    where: eq(dishes.id, dishId),
    with: {
      category: true,
      space: { with: { restaurant: true } }
    }
  });
  if (!row) return null;
  const localesFilled = Object.entries(row.name ?? {})
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
  return {
    id: row.id,
    spaceId: row.spaceId,
    categoryId: row.categoryId,
    restaurantSlug: row.space.restaurant.slug,
    restaurantName: row.space.restaurant.name,
    categoryName: (row.category.name as Record<string, string>)?.es ?? '',
    name: row.name ?? {},
    note: row.note ?? {},
    price: row.price !== null ? Number(row.price) : null,
    order: row.order,
    active: row.active,
    localesFilled,
    imageAssetId: row.imageAssetId,
    imageGradient: row.imageGradient
  };
}

export function createDishesRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();
  app.use('*', requireAuth);

  // ─── DISH CATEGORIES ───────────────────────────────────────────
  const cats = new Hono<{ Variables: AuthVars }>();

  cats.get('/', async (c) => {
    const env = c.get('env');
    const spaceId = c.req.query('spaceId');
    const db = getDb(env.DATABASE_URL);
    const allowed = await allowedSpaceIds(c);

    let rows;
    if (spaceId) {
      if (allowed && !allowed.has(spaceId)) throw new HTTPException(403, { message: 'space_forbidden' });
      rows = await db.query.dishCategories.findMany({
        where: eq(dishCategories.spaceId, spaceId),
        orderBy: [asc(dishCategories.order)]
      });
    } else {
      rows = await db.query.dishCategories.findMany({ orderBy: [asc(dishCategories.order)] });
      if (allowed) rows = rows.filter(r => allowed.has(r.spaceId));
    }
    return c.json({ categories: rows });
  });

  cats.post('/', zValidator('json', categoryCreateSchema), async (c) => {
    const env = c.get('env');
    const body = c.req.valid('json');
    await checkSpaceAccess(c, body.spaceId);
    const db = getDb(env.DATABASE_URL);
    const [row] = await db.insert(dishCategories).values({
      spaceId: body.spaceId, name: body.name, order: body.order
    }).returning();
    return c.json({ category: row }, 201);
  });

  cats.patch('/:id', zValidator('json', categoryPatchSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.dishCategories.findFirst({ where: eq(dishCategories.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    await db.update(dishCategories).set(body).where(eq(dishCategories.id, id));
    const updated = await db.query.dishCategories.findFirst({ where: eq(dishCategories.id, id) });
    return c.json({ category: updated });
  });

  cats.delete('/:id', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.dishCategories.findFirst({ where: eq(dishCategories.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    await db.delete(dishCategories).where(eq(dishCategories.id, id));
    return c.json({ ok: true });
  });

  app.route('/categories', cats);

  // ─── DISHES ────────────────────────────────────────────────────
  // GET /dishes  con filtros: restaurantSlug, categoryId, missingLocale
  app.get('/', async (c) => {
    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);
    const allowed = await allowedSpaceIds(c);
    const restaurantSlug = c.req.query('restaurantSlug');
    const categoryId = c.req.query('categoryId');
    const missingLocale = c.req.query('missingLocale');

    // Filtro por restaurante → resolver a spaceIds
    let spaceIdsFilter: string[] | null = null;
    if (restaurantSlug) {
      const r = await db.query.restaurants.findFirst({ where: eq(restaurants.slug, restaurantSlug) });
      if (!r) return c.json({ dishes: [] });
      const sRows = await db.select({ id: spaces.id }).from(spaces).where(eq(spaces.restaurantId, r.id));
      spaceIdsFilter = sRows.map(s => s.id);
    }
    if (allowed) {
      spaceIdsFilter = spaceIdsFilter
        ? spaceIdsFilter.filter(id => allowed.has(id))
        : Array.from(allowed);
    }

    const conds = [];
    if (spaceIdsFilter) {
      if (spaceIdsFilter.length === 0) return c.json({ dishes: [] });
      conds.push(inArray(dishes.spaceId, spaceIdsFilter));
    }
    if (categoryId) conds.push(eq(dishes.categoryId, categoryId));

    const rows = await db.query.dishes.findMany({
      where: conds.length > 0 ? and(...conds) : undefined,
      orderBy: [asc(dishes.order)]
    });
    let dtos = await Promise.all(rows.map(d => toDishDto(env, d.id)));
    dtos = dtos.filter(Boolean);

    if (missingLocale) {
      dtos = dtos.filter(d => d && !(d.localesFilled.includes(missingLocale)));
    }
    return c.json({ dishes: dtos });
  });

  app.get('/:id', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.dishes.findFirst({ where: eq(dishes.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    const dto = await toDishDto(env, id);
    return c.json({ dish: dto });
  });

  app.post('/', zValidator('json', dishCreateSchema), async (c) => {
    const env = c.get('env');
    const body = c.req.valid('json');
    await checkSpaceAccess(c, body.spaceId);
    const db = getDb(env.DATABASE_URL);
    const [row] = await db.insert(dishes).values({
      spaceId: body.spaceId,
      categoryId: body.categoryId,
      name: body.name,
      note: body.note,
      price: body.price !== undefined ? String(body.price) : null,
      order: body.order,
      active: body.active,
      imageAssetId: body.imageAssetId,
      imageGradient: body.imageGradient ?? 'var(--gradient-copper)'
    }).returning({ id: dishes.id });
    const dto = await toDishDto(env, row.id);
    return c.json({ dish: dto }, 201);
  });

  app.patch('/:id', zValidator('json', dishPatchSchema), async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.dishes.findFirst({ where: eq(dishes.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    const user = c.get('user')!;
    const updates: Partial<typeof dishes.$inferInsert> = { updatedAt: new Date(), updatedBy: user.id };
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.name !== undefined) updates.name = body.name;
    if (body.note !== undefined) updates.note = body.note;
    if (body.price !== undefined) updates.price = body.price === null ? null : String(body.price);
    if (body.order !== undefined) updates.order = body.order;
    if (body.active !== undefined) updates.active = body.active;
    if (body.imageAssetId !== undefined) updates.imageAssetId = body.imageAssetId;
    if (body.imageGradient !== undefined) updates.imageGradient = body.imageGradient;
    await db.update(dishes).set(updates).where(eq(dishes.id, id));
    const dto = await toDishDto(env, id);
    return c.json({ dish: dto });
  });

  app.delete('/:id', async (c) => {
    const env = c.get('env');
    const id = c.req.param('id');
    const db = getDb(env.DATABASE_URL);
    const row = await db.query.dishes.findFirst({ where: eq(dishes.id, id) });
    if (!row) throw new HTTPException(404, { message: 'not_found' });
    await checkSpaceAccess(c, row.spaceId);
    await db.delete(dishes).where(eq(dishes.id, id));
    return c.json({ ok: true });
  });

  return app;
}
