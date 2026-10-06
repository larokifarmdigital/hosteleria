import type { I18nValue } from './i18n.js';

/**
 * Entidades `Dish` + `DishCategory` — plato de la carta y su categoría.
 *
 * Un plato pertenece a UN space (una sala del restaurante) y a UNA
 * categoría dentro de esa sala. El nombre y la nota son i18n (varían
 * por idioma del contenido).
 */

export interface DishCategory {
  readonly id: string;
  readonly spaceId: string;
  name: I18nValue;
  order: number;
}

export interface Dish {
  readonly id: string;
  readonly spaceId: string;
  readonly categoryId: string;
  name: I18nValue;
  note?: I18nValue;
  price: number | null;
  order: number;
  active: boolean;
  imageAssetId: string | null;
  imageGradient: string;
}

// ─── Domain errors ───────────────────────────────────────────────
export class DishNotFoundError extends Error {
  constructor(id: string) { super(`dish_not_found:${id}`); this.name = 'DishNotFoundError'; }
}
export class DishCategoryNotFoundError extends Error {
  constructor(id: string) { super(`dish_category_not_found:${id}`); this.name = 'DishCategoryNotFoundError'; }
}
export class CategoryHasDishesError extends Error {
  constructor() { super('category_has_dishes'); this.name = 'CategoryHasDishesError'; }
}
