import type { RestaurantRepository } from '../domain/repositories/restaurantRepository';
import type { Restaurant } from '../domain/models/restaurant';
import { RestaurantNotFoundError } from '../domain/models/restaurant';

export class GetRestaurantUseCase {
  constructor(private readonly restaurants: RestaurantRepository) {}

  async execute(slug: string): Promise<Restaurant> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    return r;
  }
}
