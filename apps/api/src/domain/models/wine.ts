import type { I18nValue } from './i18n.js';

/**
 * Entidades `Wine` + `WineCategory` — vino de la carta y su categoría.
 *
 * **Diferencia clave con dish**: `wine.name` NO es i18n (los vinos son
 * nombres propios: "Vega Sicilia Único" no se traduce). El `note` sí
 * es i18n (descripción/maridaje).
 *
 * Dos precios separados: por copa y por botella (uno o ambos pueden ser null).
 */

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
  name: string;              // ← NO i18n
  region: string | null;
  note?: I18nValue;
  priceGlass: number | null;
  priceBottle: number | null;
  order: number;
  active: boolean;
  imageGradient: string;
}

// ─── Domain errors ───────────────────────────────────────────────
export class WineNotFoundError extends Error {
  constructor(id: string) { super(`wine_not_found:${id}`); this.name = 'WineNotFoundError'; }
}
export class WineCategoryNotFoundError extends Error {
  constructor(id: string) { super(`wine_category_not_found:${id}`); this.name = 'WineCategoryNotFoundError'; }
}
export class CategoryHasWinesError extends Error {
  constructor() { super('category_has_wines'); this.name = 'CategoryHasWinesError'; }
}
