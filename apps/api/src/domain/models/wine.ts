import type { I18nValue } from './i18n.js';
import { DomainError } from './errors.js';

// A diferencia de Dish, `wine.name` NO es i18n: los vinos son nombres propios
// ("Vega Sicilia Único" no se traduce). `note` sí es i18n (maridaje/descripción).

export interface WineCategory {
  readonly id: string;
  readonly spaceId: string;
  name: I18nValue;
  order: number;
}

export interface Wine {
  readonly id: string;
  readonly spaceId: string;
  readonly categoryId: string;
  name: string;
  region: string | null;
  note?: I18nValue;
  priceGlass: number | null;
  priceBottle: number | null;
  order: number;
  active: boolean;
  imageGradient: string;
}

export class WineNotFoundError extends DomainError {
  readonly code = 'WINE_NOT_FOUND';
  readonly status = 404;
  constructor(_id: string) {
    super('El vino no existe.');
    this.name = 'WineNotFoundError';
  }
}
export class WineCategoryNotFoundError extends DomainError {
  readonly code = 'WINE_CATEGORY_NOT_FOUND';
  readonly status = 404;
  constructor(_id: string) {
    super('La categoría de vinos no existe o no pertenece a este espacio.');
    this.name = 'WineCategoryNotFoundError';
  }
}
export class CategoryHasWinesError extends DomainError {
  readonly code = 'CATEGORY_HAS_WINES';
  readonly status = 400;
  constructor() {
    super('No puedes borrar esta categoría: tiene vinos. Mueve o elimina los vinos primero.');
    this.name = 'CategoryHasWinesError';
  }
}
