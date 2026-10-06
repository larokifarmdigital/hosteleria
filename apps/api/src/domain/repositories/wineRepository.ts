import type { Wine, WineCategory } from '../models/wine.js';
import type { I18nValue } from '../models/i18n.js';

/**
 * Puerto de persistencia para `Wine` + `WineCategory`. Mismo pattern que
 * `DishRepository`.
 */
export interface WineRepository {
  // ─── Wines ──────────────────────────────────────────────────────
  findById(id: string): Promise<Wine | null>;
  list(filters?: { restaurantSlug?: string; categoryId?: string }): Promise<Wine[]>;

  create(input: Omit<Wine, 'id'>): Promise<Wine>;
  update(id: string, patch: Partial<Wine>, actorId: string): Promise<void>;
  deleteById(id: string): Promise<void>;

  // ─── Categories ────────────────────────────────────────────────
  listCategories(spaceId?: string): Promise<WineCategory[]>;
  findCategoryById(id: string): Promise<WineCategory | null>;

  createCategory(input: { spaceId: string; name: I18nValue; order: number }): Promise<WineCategory>;

  /** Lanza `CategoryHasWinesError` si tiene vinos (restrict). */
  deleteCategory(id: string): Promise<void>;
}
