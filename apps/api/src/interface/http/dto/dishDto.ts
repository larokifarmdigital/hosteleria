import type { Dish, DishCategory } from '../../../domain/models/dish.js';
import type { Space } from '../../../domain/models/space.js';
import type { Restaurant } from '../../../domain/models/restaurant.js';

/**
 * DTO enriquecido del plato: añade restaurantSlug/Name y categoryName (es)
 * que la tabla del backoffice espera. `localesFilled` lista qué idiomas
 * tienen traducción en `name`.
 *
 * Se construye con lookups que la ruta hace vía repos (el UC devuelve solo
 * la entidad plana).
 */
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
