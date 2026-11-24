import type { Dish, DishCategory } from '../domain/models/dish';
import type { I18nValue } from '@/core/shared';
import type { dishes, dishCategories } from '@/core/shared/infrastructure/drizzle/schema';

export function rowToDish(row: typeof dishes.$inferSelect): Dish {
  return {
    id: row.id,
    spaceId: row.spaceId,
    categoryId: row.categoryId,
    name: (row.name as I18nValue) ?? {},
    note: row.note ? (row.note as I18nValue) : undefined,
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
    order: row.order,
    kind: row.kind
  };
}
