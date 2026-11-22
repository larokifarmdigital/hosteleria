import type { Dish, DishCategory, DishKind } from '../models/dish.js';
import type { I18nValue } from '../models/i18n.js';

export interface DishRepository {
  findById(id: string): Promise<Dish | null>;
  /** `missingLocale` filtra los que NO tienen `name` en ese código ISO. */
  list(filters?: {
    restaurantSlug?: string;
    categoryId?: string;
    missingLocale?: string;
    /** Sin `kind` salen platos y bebidas. */
    kind?: DishKind;
  }): Promise<Dish[]>;

  create(input: Omit<Dish, 'id'>): Promise<Dish>;
  update(id: string, patch: Partial<Dish>, actorId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  /** Pone `order` = posición en la lista, todo de una vez. */
  reorder(ids: string[]): Promise<void>;
  reorderCategories(ids: string[]): Promise<void>;

  listCategories(spaceId?: string, kind?: DishKind): Promise<DishCategory[]>;
  findCategoryById(id: string): Promise<DishCategory | null>;

  createCategory(input: { spaceId: string; name: I18nValue; order: number; kind?: DishKind }): Promise<DishCategory>;
  updateCategory(id: string, patch: { name?: I18nValue; order?: number }): Promise<void>;

  /** Restrict: lanza `CategoryHasDishesError` si la categoría tiene platos. */
  deleteCategory(id: string): Promise<void>;
}
