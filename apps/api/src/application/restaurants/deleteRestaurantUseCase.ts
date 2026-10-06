import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import { RestaurantNotFoundError } from '../../domain/models/restaurant.js';

/**
 * Hard delete del restaurant. Las FKs encadenan a spaces, dishes y wines.
 * Lanza `RestaurantNotFoundError` si el slug no existe.
 */
export class DeleteRestaurantUseCase {
  constructor(private readonly restaurants: RestaurantRepository) {}

  async execute(slug: string): Promise<void> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    await this.restaurants.deleteBySlug(slug);
  }
}
