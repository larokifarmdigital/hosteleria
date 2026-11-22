import type { Dish, DishCategory } from '@/core/menu';
import type { Space } from '@/core/spaces';
import type { Restaurant } from '@/core/restaurants';

// Enriquecido con lookups que la ruta compone a mano (restaurantSlug/Name
// y la variante `es` de la categoría), para que la tabla del backoffice
// no tenga que resolver joins en cliente.
export function dishToDto(dish: Dish, category: DishCategory, _space: Space, restaurant: Restaurant) {
  const localesFilled = Object.entries(dish.name ?? {})
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
  return {
    id: dish.id,
    spaceId: dish.spaceId,
    categoryId: dish.categoryId,
    restaurantSlug: restaurant.slug,
    restaurantName: restaurant.name,
    categoryName: category.name?.es ?? '',
    kind: category.kind,
    name: dish.name ?? {},
    note: dish.note ?? {},
    price: dish.price,
    order: dish.order,
    active: dish.active,
    localesFilled,
    imageAssetId: dish.imageAssetId,
    imageGradient: dish.imageGradient
  };
}
