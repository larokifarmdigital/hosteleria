import { eq, and, asc, inArray, count } from 'drizzle-orm';
import { getDb } from './client.js';
import { dishes, dishCategories, spaces, restaurants } from './schema/content.js';
import type { Dish, DishCategory } from '../../../domain/models/dish.js';
import { CategoryHasDishesError } from '../../../domain/models/dish.js';
import type { I18nValue } from '../../../domain/models/i18n.js';
import type { DishRepository } from '../../../domain/repositories/dishRepository.js';
import type { Env } from '../../../env.js';
import { rowToDish, rowToDishCategory } from './mappers/dishMapper.js';

export class DrizzleDishRepository implements DishRepository {
  constructor(private env: Env) {}
  private get db() { return getDb(this.env.DATABASE_URL); }

  async findById(id: string): Promise<Dish | null> {
    const row = await this.db.query.dishes.findFirst({ where: eq(dishes.id, id) });
    return row ? rowToDish(row) : null;
  }

  async list(filters?: {
    restaurantSlug?: string;
    categoryId?: string;
    missingLocale?: string;
  }): Promise<Dish[]> {
    // El filtro público es por slug, pero `dishes` solo guarda `spaceId` —
    // resolvemos slug → spaceIds primero (bail-out si el restaurant no existe).
    let spaceIdsFilter: string[] | null = null;
    if (filters?.restaurantSlug) {
      const r = await this.db.query.restaurants.findFirst({
        where: eq(restaurants.slug, filters.restaurantSlug)
      });
      if (!r) return [];
      const sRows = await this.db
        .select({ id: spaces.id })
        .from(spaces)
        .where(eq(spaces.restaurantId, r.id));
      spaceIdsFilter = sRows.map(s => s.id);
      if (spaceIdsFilter.length === 0) return [];
    }

    const conds = [];
    if (spaceIdsFilter) conds.push(inArray(dishes.spaceId, spaceIdsFilter));
    if (filters?.categoryId) conds.push(eq(dishes.categoryId, filters.categoryId));

    const rows = await this.db.query.dishes.findMany({
      where: conds.length > 0 ? and(...conds) : undefined,
      orderBy: [asc(dishes.order)]
    });

    const result = rows.map(rowToDish);

    // `missingLocale` filtra en memoria: tocar jsonb en SQL es más caro
    // y los listados típicos (~100 platos) caben sin esfuerzo.
    if (filters?.missingLocale) {
      return result.filter(d => !d.name?.[filters.missingLocale!]);
    }
    return result;
  }

  async create(input: Omit<Dish, 'id'>): Promise<Dish> {
    const [row] = await this.db.insert(dishes).values({
      spaceId: input.spaceId,
      categoryId: input.categoryId,
      name: input.name,
      note: input.note,
      price: input.price !== null ? String(input.price) : null,
      order: input.order,
      active: input.active,
      imageAssetId: input.imageAssetId,
      imageGradient: input.imageGradient
    }).returning();
    return rowToDish(row);
  }

  async update(id: string, patch: Partial<Dish>, actorId: string): Promise<void> {
    const updates: Partial<typeof dishes.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: actorId
    };
    if (patch.categoryId !== undefined) updates.categoryId = patch.categoryId;
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.note !== undefined) updates.note = patch.note;
    if (patch.price !== undefined) updates.price = patch.price !== null ? String(patch.price) : null;
    if (patch.order !== undefined) updates.order = patch.order;
    if (patch.active !== undefined) updates.active = patch.active;
    if (patch.imageAssetId !== undefined) updates.imageAssetId = patch.imageAssetId;
    if (patch.imageGradient !== undefined) updates.imageGradient = patch.imageGradient;
    await this.db.update(dishes).set(updates).where(eq(dishes.id, id));
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(dishes).where(eq(dishes.id, id));
  }

  // ─── Categories ────────────────────────────────────────────────
  async listCategories(spaceId?: string): Promise<DishCategory[]> {
    const rows = await this.db.query.dishCategories.findMany({
      where: spaceId ? eq(dishCategories.spaceId, spaceId) : undefined,
      orderBy: [asc(dishCategories.order)]
    });
    return rows.map(rowToDishCategory);
  }

  async findCategoryById(id: string): Promise<DishCategory | null> {
    const row = await this.db.query.dishCategories.findFirst({ where: eq(dishCategories.id, id) });
    return row ? rowToDishCategory(row) : null;
  }

  async createCategory(input: { spaceId: string; name: I18nValue; order: number }): Promise<DishCategory> {
    const [row] = await this.db.insert(dishCategories).values(input).returning();
    return rowToDishCategory(row);
  }

  async updateCategory(id: string, patch: { name?: I18nValue; order?: number }): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    await this.db.update(dishCategories).set(patch).where(eq(dishCategories.id, id));
  }

  async deleteCategory(id: string): Promise<void> {
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(dishes)
      .where(eq(dishes.categoryId, id));
    if (Number(n) > 0) throw new CategoryHasDishesError();
    await this.db.delete(dishCategories).where(eq(dishCategories.id, id));
  }
}
