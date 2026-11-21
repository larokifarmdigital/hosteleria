import type { DishCategory, WineCategory } from '@hosteleria/api-client';

export type MenuKind = 'dishes' | 'wines';
export type MenuCategory = DishCategory | WineCategory;

/** Lo que el formulario necesita saber del sitio donde se edita la carta. */
export interface MenuScope {
  spaceId: string;
  locales: string[];
  defaultLocale: string;
  localeNames: Record<string, string>;
}

export function categoryLabel(category: MenuCategory, defaultLocale: string): string {
  return category.name[defaultLocale] ?? Object.values(category.name).find(Boolean) ?? 'Sin nombre';
}
