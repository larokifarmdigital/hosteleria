import type { RestaurantRepository } from '../domain/repositories/restaurantRepository';
import { RestaurantNotFoundError } from '../domain/models/restaurant';

export class DeleteRestaurantUseCase {
  constructor(private readonly restaurants: RestaurantRepository) {}

  async execute(slug: string): Promise<void> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    await this.restaurants.deleteBySlug(slug);
  }
}
