import { Hono } from 'hono';
import { validate } from '../validate.js';
import { z } from 'zod';
import type { Context } from 'hono';
import { requireAuth } from '../middleware/authMiddleware.js';
import { allowedSpaceIds, assertMediaInRestaurant, assertSpaceAccess } from '../accessControl.js';
import { dishToDto } from '../dto/dishDto.js';
import { assertSameGroup } from '../../../domain/models/menuOrder.js';
import {
  DISH_KINDS,
  DishCategoryNotFoundError,
  type Dish,
  type DishKind
} from '../../../domain/models/dish.js';
import { SpaceNotFoundError } from '../../../domain/models/space.js';
import { RestaurantNotFoundError } from '../../../domain/models/restaurant.js';
import type { AppBindings } from '../types.js';

export function createDishesRoutes() {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);

  const cats = new Hono<AppBindings>();

  cats.get('/', async (c) => {
    const spaceId = c.req.query('spaceId');
    const allowed = await allowedSpaceIds(c);
    if (spaceId && allowed && !allowed.has(spaceId)) return c.json({ categories: [] });
    const rows = await c.get('container').dishes.listCategories.execute(spaceId ?? undefined, kindOf(c));
    const filtered = allowed ? rows.filter(r => allowed.has(r.spaceId)) : rows;
    return c.json({ categories: filtered });
  });

  cats.post('/', validate('json', categoryCreateSchema), async (c) => {
    const body = c.req.valid('json');
    await assertSpaceAccess(c, body.spaceId);
    c.set('rebuild', { spaceId: body.spaceId });
    const row = await c.get('container').dishes.createCategory.execute(body);
    return c.json({ category: row }, 201);
  });

  // Orden de las categorías de una carta (platos o bebidas) de un espacio.
  cats.post('/reorder', validate('json', reorderSchema), async (c) => {
    const { ids } = c.req.valid('json');
    const repo = c.get('container').repos.dishesRepo;
    const found = await Promise.all(ids.map(id => repo.findCategoryById(id)));
    const group = assertSameGroup(ids, found, cat => `${cat.spaceId}|${cat.kind}`);
    const spaceId = group.split('|')[0];
    await assertSpaceAccess(c, spaceId);
    c.set('rebuild', { spaceId });
    await repo.reorderCategories(ids);
    return c.json({ ok: true });
  });

  cats.patch('/:id', validate('json', categoryPatchSchema), async (c) => {
    const id = c.req.param('id');
    const cat = await c.get('container').repos.dishesRepo.findCategoryById(id);
    if (!cat) throw new DishCategoryNotFoundError(id);
    await assertSpaceAccess(c, cat.spaceId);
    c.set('rebuild', { spaceId: cat.spaceId });
    await c.get('container').dishes.updateCategory.execute(id, c.req.valid('json'));
    const updated = await c.get('container').repos.dishesRepo.findCategoryById(id);
    return c.json({ category: updated });
  });

  cats.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const cat = await c.get('container').repos.dishesRepo.findCategoryById(id);
    if (!cat) throw new DishCategoryNotFoundError(id);
    await assertSpaceAccess(c, cat.spaceId);
    c.set('rebuild', { spaceId: cat.spaceId });
    await c.get('container').dishes.deleteCategory.execute(id);
    return c.json({ ok: true });
  });

  app.route('/categories', cats);

  app.get('/', async (c) => {
    const container = c.get('container');
    const allowed = await allowedSpaceIds(c);
    const restaurantSlug = c.req.query('restaurantSlug') || undefined;
    const categoryId = c.req.query('categoryId') || undefined;
    const missingLocale = c.req.query('missingLocale') || undefined;

    // Con una categoría concreta ya está dicho de qué carta es.
    const list = await container.dishes.list.execute({ restaurantSlug, categoryId, missingLocale, kind: categoryId ? undefined : kindOf(c) });
    const filtered = allowed ? list.filter(d => allowed.has(d.spaceId)) : list;

    const dtos = await Promise.all(filtered.map(d => enrichDish(c, d)));
    return c.json({ dishes: dtos });
  });

  app.get('/:id', async (c) => {
    const d = await c.get('container').dishes.get.execute(c.req.param('id'));
    await assertSpaceAccess(c, d.spaceId);
    return c.json({ dish: await enrichDish(c, d) });
  });

  app.post('/', validate('json', dishCreateSchema), async (c) => {
    const body = c.req.valid('json');
    await assertSpaceAccess(c, body.spaceId);
    c.set('rebuild', { spaceId: body.spaceId });
    if (body.imageAssetId) await assertDishImage(c, body.spaceId, body.imageAssetId);
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

  // Orden de los platos dentro de una categoría.
  app.post('/reorder', validate('json', reorderSchema), async (c) => {
    const { ids } = c.req.valid('json');
    const repo = c.get('container').repos.dishesRepo;
    const found = await Promise.all(ids.map(id => repo.findById(id)));
    assertSameGroup(ids, found, dish => dish.categoryId);
    const spaceId = found[0]!.spaceId;
    await assertSpaceAccess(c, spaceId);
    c.set('rebuild', { spaceId });
    await repo.reorder(ids);
    return c.json({ ok: true });
  });

  app.patch('/:id', validate('json', dishPatchSchema), async (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const existing = await c.get('container').dishes.get.execute(id);
    await assertSpaceAccess(c, existing.spaceId);
    c.set('rebuild', { spaceId: existing.spaceId });
    const body = c.req.valid('json');
    if (body.imageAssetId) await assertDishImage(c, existing.spaceId, body.imageAssetId);
    const d = await c.get('container').dishes.update.execute(id, body, user.id);
    return c.json({ dish: await enrichDish(c, d) });
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await c.get('container').dishes.get.execute(id);
    await assertSpaceAccess(c, existing.spaceId);
    c.set('rebuild', { spaceId: existing.spaceId });
    await c.get('container').dishes.delete.execute(id);
    return c.json({ ok: true });
  });

  return app;
}

/** `?kind=drink` pide la carta de bebidas; sin él, la de platos. */
function kindOf(c: Context<AppBindings>): DishKind {
  return c.req.query('kind') === 'drink' ? 'drink' : 'dish';
}

async function assertDishImage(c: Context<AppBindings>, spaceId: string, mediaId: string) {
  const space = await c.get('container').repos.spacesRepo.findById(spaceId);
  if (!space) throw new SpaceNotFoundError(spaceId);
  await assertMediaInRestaurant(c, mediaId, space.restaurantId);
}

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

const i18nSchema = z.record(z.string());


/** Los ids en el orden nuevo. */
const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(300) });

const categoryCreateSchema = z.object({
  spaceId: z.string().min(1),
  name: i18nSchema,
  order: z.number().int().min(0).default(0),
  kind: z.enum(DISH_KINDS).default('dish')
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
