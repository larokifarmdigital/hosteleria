import type { Wine, WineCategory } from '../../../../domain/models/wine.js';
import type { I18nValue } from '../../../../domain/models/i18n.js';
import type { wines, wineCategories } from '../schema/content.js';

export function rowToWine(row: typeof wines.$inferSelect): Wine {
  return {
    id: row.id,
    spaceId: row.spaceId,
    categoryId: row.categoryId,
    name: row.name,                                              // NO i18n
    region: row.region,
    note: row.note ? (row.note as I18nValue) : undefined,
    priceGlass: row.priceGlass !== null ? Number(row.priceGlass) : null,
    priceBottle: row.priceBottle !== null ? Number(row.priceBottle) : null,
    order: row.order,
    active: row.active,
    imageGradient: row.imageGradient
  };
}

export function rowToWineCategory(row: typeof wineCategories.$inferSelect): WineCategory {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: (row.name as I18nValue) ?? {},
    order: row.order
  };
}
