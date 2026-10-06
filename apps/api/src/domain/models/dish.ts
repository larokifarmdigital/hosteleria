import type { I18nValue } from './i18n.js';

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

export class DishNotFoundError extends Error {
  constructor(id: string) { super(`dish_not_found:${id}`); this.name = 'DishNotFoundError'; }
}
export class DishCategoryNotFoundError extends Error {
  constructor(id: string) { super(`dish_category_not_found:${id}`); this.name = 'DishCategoryNotFoundError'; }
}
export class CategoryHasDishesError extends Error {
  constructor() { super('category_has_dishes'); this.name = 'CategoryHasDishesError'; }
}
