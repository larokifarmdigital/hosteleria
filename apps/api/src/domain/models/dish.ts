import type { I18nValue } from './i18n.js';
import { DomainError } from './errors.js';

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

export class DishNotFoundError extends DomainError {
  readonly code = 'DISH_NOT_FOUND';
  readonly status = 404;
  constructor(_id: string) {
    super('El plato no existe.');
    this.name = 'DishNotFoundError';
  }
}
export class DishCategoryNotFoundError extends DomainError {
  readonly code = 'DISH_CATEGORY_NOT_FOUND';
  readonly status = 404;
  constructor(_id: string) {
    super('La categoría de platos no existe o no pertenece a este espacio.');
    this.name = 'DishCategoryNotFoundError';
  }
}
export class CategoryHasDishesError extends DomainError {
  readonly code = 'CATEGORY_HAS_DISHES';
  readonly status = 400;
  constructor() {
    super('No puedes borrar esta categoría: tiene platos. Mueve o elimina los platos primero.');
    this.name = 'CategoryHasDishesError';
  }
}
