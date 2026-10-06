import type { Dish, DishCategory } from '../models/dish.js';
import type { I18nValue } from '../models/i18n.js';

/**
 * Puerto de persistencia para `Dish` + `DishCategory`.
 *
 * Dos entidades estrechamente relacionadas comparten repo: una categoría
 * no tiene sentido fuera del contexto de los platos que agrupa.
 */
export interface DishRepository {
  // ─── Dishes ─────────────────────────────────────────────────────
  findById(id: string): Promise<Dish | null>;
  list(filters?: {
    restaurantSlug?: string;
    categoryId?: string;
    missingLocale?: string;
  }): Promise<Dish[]>;

  create(input: Omit<Dish, 'id'>): Promise<Dish>;
  update(id: string, patch: Partial<Dish>, actorId: string): Promise<void>;
  deleteById(id: string): Promise<void>;

  // ─── Categories ────────────────────────────────────────────────
  listCategories(spaceId?: string): Promise<DishCategory[]>;
  findCategoryById(id: string): Promise<DishCategory | null>;

  createCategory(input: { spaceId: string; name: I18nValue; order: number }): Promise<DishCategory>;
  updateCategory(id: string, patch: { name?: I18nValue; order?: number }): Promise<void>;

  /** Lanza `CategoryHasDishesError` si la categoría tiene platos (restrict). */
  deleteCategory(id: string): Promise<void>;
}
