import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { Restaurant } from '../../domain/models/restaurant.js';
import type { SessionUser } from '../../domain/models/user.js';

/**
 * Lista los restaurantes a los que el user autenticado tiene acceso.
 *
 *  - `admin` → ve todos (`listAccessibleBy(null)`).
 *  - `editor` → solo los que están en `user_restaurants` (consulta ids).
 *
 * Si el editor no tiene ningún restaurant asignado, el repo devuelve `[]`.
 */
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
