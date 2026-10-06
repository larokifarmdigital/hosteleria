import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import { requireAuth } from '../middleware/authMiddleware.js';
import { allowedSpaceIds, assertSpaceAccess } from '../accessControl.js';
import { dishToDto } from '../dto/dishDto.js';
import {
  DishCategoryNotFoundError,
  type Dish
} from '../../../domain/models/dish.js';
import { SpaceNotFoundError } from '../../../domain/models/space.js';
import { RestaurantNotFoundError } from '../../../domain/models/restaurant.js';
import type { AppBindings } from '../types.js';

/**
 * Rutas thin de platos + categorías.
 *
 * Acceso: admin pasa libre; editor filtra por `allowedSpaceIds`.
 * DTOs enriquecidos (restaurantSlug/Name + categoryName) se componen leyendo
 * repos del container.
 */
export function createDishesRoutes() {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);

  // ─── DISH CATEGORIES ─────────────────────────────────────────────
  const cats = new Hono<AppBindings>();

  cats.get('/', async (c) => {
    const spaceId = c.req.query('spaceId');
    const allowed = await allowedSpaceIds(c);
    if (spaceId && allowed && !allowed.has(spaceId)) return c.json({ categories: [] });
    const rows = await c.get('container').dishes.listCategories.execute(spaceId ?? undefined);
    const filtered = allowed ? rows.filter(r => allowed.has(r.spaceId)) : rows;
    return c.json({ categories: filtered });
  });

  cats.post('/', zValidator('json', categoryCreateSchema), async (c) => {
    const body = c.req.valid('json');
    await assertSpaceAccess(c, body.spaceId);
    const row = await c.get('container').dishes.createCategory.execute(body);
    return c.json({ category: row }, 201);
  });

  cats.patch('/:id', zValidator('json', categoryPatchSchema), async (c) => {
    const id = c.req.param('id');
    const cat = await c.get('container').repos.dishesRepo.findCategoryById(id);
    if (!cat) throw new DishCategoryNotFoundError(id);
    await assertSpaceAccess(c, cat.spaceId);
    await c.get('container').dishes.updateCategory.execute(id, c.req.valid('json'));
    const updated = await c.get('container').repos.dishesRepo.findCategoryById(id);
    return c.json({ category: updated });
  });

  cats.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const cat = await c.get('container').repos.dishesRepo.findCategoryById(id);
    if (!cat) throw new DishCategoryNotFoundError(id);
    await assertSpaceAccess(c, cat.spaceId);
    await c.get('container').dishes.deleteCategory.execute(id);
    return c.json({ ok: true });
  });

  app.route('/categories', cats);

  // ─── DISHES ──────────────────────────────────────────────────────
  app.get('/', async (c) => {
    const container = c.get('container');
    const allowed = await allowedSpaceIds(c);
    const restaurantSlug = c.req.query('restaurantSlug') || undefined;
    const categoryId = c.req.query('categoryId') || undefined;
    const missingLocale = c.req.query('missingLocale') || undefined;

    const list = await container.dishes.list.execute({ restaurantSlug, categoryId, missingLocale });
    const filtered = allowed ? list.filter(d => allowed.has(d.spaceId)) : list;

    const dtos = await Promise.all(filtered.map(d => enrichDish(c, d)));
    return c.json({ dishes: dtos });
  });

  app.get('/:id', async (c) => {
    const d = await c.get('container').dishes.get.execute(c.req.param('id'));
    await assertSpaceAccess(c, d.spaceId);
    return c.json({ dish: await enrichDish(c, d) });
  });

  app.post('/', zValidator('json', dishCreateSchema), async (c) => {
    const body = c.req.valid('json');
    await assertSpaceAccess(c, body.spaceId);
    const d = await c.get('container').dishes.create.execute({
      spaceId: body.spaceId,
      categoryId: body.categoryId,
      name: body.name,
      note: body.note,
      price: body.price ?? null,
      order: body.order,
      active: body.active,
      imageAssetId: body.imageAssetId ?? null,
      imageGradient: body.imageGradient ?? 'var(--gradient-copper)'
    });
    return c.json({ dish: await enrichDish(c, d) }, 201);
  });

  app.patch('/:id', zValidator('json', dishPatchSchema), async (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const existing = await c.get('container').dishes.get.execute(id);
    await assertSpaceAccess(c, existing.spaceId);
    const d = await c.get('container').dishes.update.execute(id, c.req.valid('json'), user.id);
    return c.json({ dish: await enrichDish(c, d) });
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await c.get('container').dishes.get.execute(id);
    await assertSpaceAccess(c, existing.spaceId);
    await c.get('container').dishes.delete.execute(id);
    return c.json({ ok: true });
  });

  return app;
}

/** Enriquece un `Dish` con category + space + restaurant via repos. */
async function enrichDish(c: Context<AppBindings>, dish: Dish) {
  const { dishesRepo, spacesRepo, restaurantsRepo } = c.get('container').repos;
  const [cat, space] = await Promise.all([
    dishesRepo.findCategoryById(dish.categoryId),
    spacesRepo.findById(dish.spaceId)
  ]);
  if (!cat) throw new DishCategoryNotFoundError(dish.categoryId);
  if (!space) throw new SpaceNotFoundError(dish.spaceId);
  const restaurant = await restaurantsRepo.findById(space.restaurantId);
  if (!restaurant) throw new RestaurantNotFoundError(space.restaurantId);
  return dishToDto(dish, cat, space, restaurant);
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
