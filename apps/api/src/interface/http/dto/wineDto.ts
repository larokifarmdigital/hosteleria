import type { Wine, WineCategory } from '../../../domain/models/wine.js';
import type { Space } from '../../../domain/models/space.js';
import type { Restaurant } from '../../../domain/models/restaurant.js';

/**
 * DTO enriquecido del vino. Nota: `wine.name` NO es i18n (nombres propios),
 * así que no hay `localesFilled`.
 */
export function wineToDto(wine: Wine, category: WineCategory, _space: Space, restaurant: Restaurant) {
  return {
    id: wine.id,
    spaceId: wine.spaceId,
    categoryId: wine.categoryId,
    restaurantSlug: restaurant.slug,
    restaurantName: restaurant.name,
    categoryName: category.name?.es ?? '',
    name: wine.name,
    region: wine.region,
    note: wine.note ?? {},
    priceGlass: wine.priceGlass,
    priceBottle: wine.priceBottle,
    order: wine.order,
    active: wine.active,
    imageGradient: wine.imageGradient
  };
}
