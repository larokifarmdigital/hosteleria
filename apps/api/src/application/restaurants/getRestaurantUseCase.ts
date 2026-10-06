import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { Restaurant } from '../../domain/models/restaurant.js';
import { RestaurantNotFoundError } from '../../domain/models/restaurant.js';

export class GetRestaurantUseCase {
  constructor(private readonly restaurants: RestaurantRepository) {}

  async execute(slug: string): Promise<Restaurant> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    return r;
  }
}
