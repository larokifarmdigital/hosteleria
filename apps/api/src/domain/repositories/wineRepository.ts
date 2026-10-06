import type { Wine, WineCategory } from '../models/wine.js';
import type { I18nValue } from '../models/i18n.js';

export interface WineRepository {
  findById(id: string): Promise<Wine | null>;
  list(filters?: { restaurantSlug?: string; categoryId?: string }): Promise<Wine[]>;

  create(input: Omit<Wine, 'id'>): Promise<Wine>;
  update(id: string, patch: Partial<Wine>, actorId: string): Promise<void>;
  deleteById(id: string): Promise<void>;

  listCategories(spaceId?: string): Promise<WineCategory[]>;
  findCategoryById(id: string): Promise<WineCategory | null>;
  createCategory(input: { spaceId: string; name: I18nValue; order: number }): Promise<WineCategory>;

  /** Restrict: lanza `CategoryHasWinesError` si tiene vinos. */
  deleteCategory(id: string): Promise<void>;
}
