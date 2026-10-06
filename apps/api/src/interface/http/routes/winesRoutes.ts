import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import { requireAuth } from '../middleware/authMiddleware.js';
import { allowedSpaceIds, assertSpaceAccess } from '../accessControl.js';
import { wineToDto } from '../dto/wineDto.js';
import {
  WineCategoryNotFoundError,
  type Wine
} from '../../../domain/models/wine.js';
import { SpaceNotFoundError } from '../../../domain/models/space.js';
import { RestaurantNotFoundError } from '../../../domain/models/restaurant.js';
import type { AppBindings } from '../types.js';

/**
 * Rutas thin de vinos + categorías. Diferencia vs. dishes:
 *  - `wine.name` NO es i18n (nombres propios) → no hay `localesFilled`.
 *  - Dos precios separados: `priceGlass` + `priceBottle`.
 */
export function createWinesRoutes() {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);

  // ─── WINE CATEGORIES ─────────────────────────────────────────────
  const cats = new Hono<AppBindings>();

  cats.get('/', async (c) => {
    const spaceId = c.req.query('spaceId');
    const allowed = await allowedSpaceIds(c);
    if (spaceId && allowed && !allowed.has(spaceId)) return c.json({ categories: [] });
    const rows = await c.get('container').wines.listCategories.execute(spaceId ?? undefined);
    const filtered = allowed ? rows.filter(r => allowed.has(r.spaceId)) : rows;
    return c.json({ categories: filtered });
  });

  cats.post('/', zValidator('json', categoryCreateSchema), async (c) => {
    const body = c.req.valid('json');
    await assertSpaceAccess(c, body.spaceId);
    const row = await c.get('container').wines.createCategory.execute(body);
    return c.json({ category: row }, 201);
  });

  cats.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const cat = await c.get('container').repos.winesRepo.findCategoryById(id);
    if (!cat) throw new WineCategoryNotFoundError(id);
    await assertSpaceAccess(c, cat.spaceId);
    await c.get('container').wines.deleteCategory.execute(id);
    return c.json({ ok: true });
  });

  app.route('/categories', cats);

  // ─── WINES ───────────────────────────────────────────────────────
  app.get('/', async (c) => {
    const allowed = await allowedSpaceIds(c);
    const restaurantSlug = c.req.query('restaurantSlug') || undefined;
    const categoryId = c.req.query('categoryId') || undefined;

    const list = await c.get('container').wines.list.execute({ restaurantSlug, categoryId });
    const filtered = allowed ? list.filter(w => allowed.has(w.spaceId)) : list;
    const dtos = await Promise.all(filtered.map(w => enrichWine(c, w)));
    return c.json({ wines: dtos });
  });

  app.get('/:id', async (c) => {
    const w = await c.get('container').wines.get.execute(c.req.param('id'));
    await assertSpaceAccess(c, w.spaceId);
    return c.json({ wine: await enrichWine(c, w) });
  });

  app.post('/', zValidator('json', wineCreateSchema), async (c) => {
    const body = c.req.valid('json');
    await assertSpaceAccess(c, body.spaceId);
    const w = await c.get('container').wines.create.execute({
      spaceId: body.spaceId,
      categoryId: body.categoryId,
      name: body.name,
      region: body.region ?? null,
      note: body.note,
      priceGlass: body.priceGlass ?? null,
      priceBottle: body.priceBottle ?? null,
      order: body.order,
      active: body.active,
      imageGradient: body.imageGradient ?? 'var(--gradient-copper)'
    });
    return c.json({ wine: await enrichWine(c, w) }, 201);
  });

  app.patch('/:id', zValidator('json', winePatchSchema), async (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const existing = await c.get('container').wines.get.execute(id);
    await assertSpaceAccess(c, existing.spaceId);
    const w = await c.get('container').wines.update.execute(id, c.req.valid('json'), user.id);
    return c.json({ wine: await enrichWine(c, w) });
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await c.get('container').wines.get.execute(id);
    await assertSpaceAccess(c, existing.spaceId);
    await c.get('container').wines.delete.execute(id);
    return c.json({ ok: true });
  });

  return app;
}

async function enrichWine(c: Context<AppBindings>, wine: Wine) {
  const { winesRepo, spacesRepo, restaurantsRepo } = c.get('container').repos;
  const [cat, space] = await Promise.all([
    winesRepo.findCategoryById(wine.categoryId),
    spacesRepo.findById(wine.spaceId)
  ]);
  if (!cat) throw new WineCategoryNotFoundError(wine.categoryId);
  if (!space) throw new SpaceNotFoundError(wine.spaceId);
  const restaurant = await restaurantsRepo.findById(space.restaurantId);
  if (!restaurant) throw new RestaurantNotFoundError(space.restaurantId);
  return wineToDto(wine, cat, space, restaurant);
}

// ═══════════════════════════════════════════════════════════════════
// Zod schemas
// ═══════════════════════════════════════════════════════════════════
const i18nSchema = z.record(z.string());

const categoryCreateSchema = z.object({
  spaceId: z.string().min(1),
  name: i18nSchema,
  order: z.number().int().min(0).default(0)
});

const wineCreateSchema = z.object({
  spaceId: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1).max(200),
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
