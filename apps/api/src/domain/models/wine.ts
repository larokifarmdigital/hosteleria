import type { I18nValue } from './i18n.js';

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

export class WineNotFoundError extends Error {
  constructor(id: string) { super(`wine_not_found:${id}`); this.name = 'WineNotFoundError'; }
}
export class WineCategoryNotFoundError extends Error {
  constructor(id: string) { super(`wine_category_not_found:${id}`); this.name = 'WineCategoryNotFoundError'; }
}
export class CategoryHasWinesError extends Error {
  constructor() { super('category_has_wines'); this.name = 'CategoryHasWinesError'; }
}
