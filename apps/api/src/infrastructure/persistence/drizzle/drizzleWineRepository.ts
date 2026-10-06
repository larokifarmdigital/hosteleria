import { eq, and, asc, inArray, count } from 'drizzle-orm';
import { getDb } from './client.js';
import { wines, wineCategories, spaces, restaurants } from './schema/content.js';
import type { Wine, WineCategory } from '../../../domain/models/wine.js';
import { CategoryHasWinesError } from '../../../domain/models/wine.js';
import type { I18nValue } from '../../../domain/models/i18n.js';
import type { WineRepository } from '../../../domain/repositories/wineRepository.js';
import type { Env } from '../../../env.js';
import { rowToWine, rowToWineCategory } from './mappers/wineMapper.js';

export class DrizzleWineRepository implements WineRepository {
  constructor(private env: Env) {}
  private get db() { return getDb(this.env.DATABASE_URL); }

  async findById(id: string): Promise<Wine | null> {
    const row = await this.db.query.wines.findFirst({ where: eq(wines.id, id) });
    return row ? rowToWine(row) : null;
  }

  async list(filters?: { restaurantSlug?: string; categoryId?: string }): Promise<Wine[]> {
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
    if (spaceIdsFilter) conds.push(inArray(wines.spaceId, spaceIdsFilter));
    if (filters?.categoryId) conds.push(eq(wines.categoryId, filters.categoryId));

    const rows = await this.db.query.wines.findMany({
      where: conds.length > 0 ? and(...conds) : undefined,
      orderBy: [asc(wines.order)]
    });
    return rows.map(rowToWine);
  }

  async create(input: Omit<Wine, 'id'>): Promise<Wine> {
    const [row] = await this.db.insert(wines).values({
      spaceId: input.spaceId,
      categoryId: input.categoryId,
      name: input.name,
      region: input.region,
      note: input.note,
      priceGlass: input.priceGlass !== null ? String(input.priceGlass) : null,
      priceBottle: input.priceBottle !== null ? String(input.priceBottle) : null,
      order: input.order,
      active: input.active,
      imageGradient: input.imageGradient
    }).returning();
    return rowToWine(row);
  }

  async update(id: string, patch: Partial<Wine>, actorId: string): Promise<void> {
    const updates: Partial<typeof wines.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: actorId
    };
    if (patch.categoryId !== undefined) updates.categoryId = patch.categoryId;
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.region !== undefined) updates.region = patch.region;
    if (patch.note !== undefined) updates.note = patch.note;
    if (patch.priceGlass !== undefined) updates.priceGlass = patch.priceGlass !== null ? String(patch.priceGlass) : null;
    if (patch.priceBottle !== undefined) updates.priceBottle = patch.priceBottle !== null ? String(patch.priceBottle) : null;
    if (patch.order !== undefined) updates.order = patch.order;
    if (patch.active !== undefined) updates.active = patch.active;
    if (patch.imageGradient !== undefined) updates.imageGradient = patch.imageGradient;
    await this.db.update(wines).set(updates).where(eq(wines.id, id));
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(wines).where(eq(wines.id, id));
  }

  // ─── Categories ────────────────────────────────────────────────
  async listCategories(spaceId?: string): Promise<WineCategory[]> {
    const rows = await this.db.query.wineCategories.findMany({
      where: spaceId ? eq(wineCategories.spaceId, spaceId) : undefined,
      orderBy: [asc(wineCategories.order)]
    });
    return rows.map(rowToWineCategory);
  }

  async findCategoryById(id: string): Promise<WineCategory | null> {
    const row = await this.db.query.wineCategories.findFirst({ where: eq(wineCategories.id, id) });
    return row ? rowToWineCategory(row) : null;
  }

  async createCategory(input: { spaceId: string; name: I18nValue; order: number }): Promise<WineCategory> {
    const [row] = await this.db.insert(wineCategories).values(input).returning();
    return rowToWineCategory(row);
  }

  async deleteCategory(id: string): Promise<void> {
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(wines)
      .where(eq(wines.categoryId, id));
    if (Number(n) > 0) throw new CategoryHasWinesError();
    await this.db.delete(wineCategories).where(eq(wineCategories.id, id));
  }
}
