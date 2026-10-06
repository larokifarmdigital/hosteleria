import type { Dish, DishCategory } from '../../../../domain/models/dish.js';
import type { I18nValue } from '../../../../domain/models/i18n.js';
import type { dishes, dishCategories } from '../schema/content.js';

export function rowToDish(row: typeof dishes.$inferSelect): Dish {
  return {
    id: row.id,
    spaceId: row.spaceId,
    categoryId: row.categoryId,
    name: (row.name as I18nValue) ?? {},
    note: row.note ? (row.note as I18nValue) : undefined,
    // Drizzle numeric → string | null; parseamos a number | null
    price: row.price !== null ? Number(row.price) : null,
    order: row.order,
    active: row.active,
    imageAssetId: row.imageAssetId,
    imageGradient: row.imageGradient
  };
}

export function rowToDishCategory(row: typeof dishCategories.$inferSelect): DishCategory {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: (row.name as I18nValue) ?? {},
    order: row.order
  };
}
