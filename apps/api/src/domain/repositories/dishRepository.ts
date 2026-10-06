import type { Dish, DishCategory } from '../models/dish.js';
import type { I18nValue } from '../models/i18n.js';

export interface DishRepository {
  findById(id: string): Promise<Dish | null>;
  /** `missingLocale` filtra los que NO tienen `name` en ese código ISO. */
  list(filters?: {
    restaurantSlug?: string;
    categoryId?: string;
    missingLocale?: string;
  }): Promise<Dish[]>;

  create(input: Omit<Dish, 'id'>): Promise<Dish>;
  update(id: string, patch: Partial<Dish>, actorId: string): Promise<void>;
  deleteById(id: string): Promise<void>;

  listCategories(spaceId?: string): Promise<DishCategory[]>;
  findCategoryById(id: string): Promise<DishCategory | null>;

  createCategory(input: { spaceId: string; name: I18nValue; order: number }): Promise<DishCategory>;
  updateCategory(id: string, patch: { name?: I18nValue; order?: number }): Promise<void>;

  /** Restrict: lanza `CategoryHasDishesError` si la categoría tiene platos. */
  deleteCategory(id: string): Promise<void>;
}
