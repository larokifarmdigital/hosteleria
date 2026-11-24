import type { Wine, WineCategory } from '@/core/menu';
import type { Space } from '@/core/spaces';
import type { Restaurant } from '@/core/restaurants';

// Sin `localesFilled`: `wine.name` es nombre propio, no i18n (ver Wine).
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
