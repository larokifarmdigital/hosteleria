import type { RestaurantRepository } from '../domain/repositories/restaurantRepository';
import type { UserRepository, SessionUser } from '@/core/auth';
import type { Restaurant } from '../domain/models/restaurant';

export class ListRestaurantsUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly users: UserRepository
  ) {}

  async execute(user: SessionUser): Promise<Restaurant[]> {
    if (user.role === 'admin') return this.restaurants.listAccessibleBy(null);
    const allowedIds = await this.users.listRestaurantIds(user.id);
    return this.restaurants.listAccessibleBy(allowedIds);
  }
}
