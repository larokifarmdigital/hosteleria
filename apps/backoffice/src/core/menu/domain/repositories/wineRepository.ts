import type { Wine, WineCategory } from '../models/wine';
import type { I18nValue } from '@/core/shared/domain';

export interface WineRepository {
  findById(id: string): Promise<Wine | null>;
  list(filters?: { restaurantSlug?: string; categoryId?: string }): Promise<Wine[]>;

  create(input: Omit<Wine, 'id'>): Promise<Wine>;
  update(id: string, patch: Partial<Wine>, actorId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  /** Pone `order` = posición en la lista, todo de una vez. */
  reorder(ids: string[]): Promise<void>;
  reorderCategories(ids: string[]): Promise<void>;

  listCategories(spaceId?: string): Promise<WineCategory[]>;
  findCategoryById(id: string): Promise<WineCategory | null>;
  createCategory(input: { spaceId: string; name: I18nValue; order: number }): Promise<WineCategory>;

  updateCategory(id: string, patch: { name?: I18nValue; order?: number }): Promise<void>;

  /** Restrict: lanza `CategoryHasWinesError` si tiene vinos. */
  /** Vuelve a crear (o deja como estaban) categorías y vinos con sus ids: recuperar lo publicado. */
  restore(categories: WineCategory[], wines: Wine[]): Promise<void>;
  deleteCategory(id: string): Promise<void>;
}
