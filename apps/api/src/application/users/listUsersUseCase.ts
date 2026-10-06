import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { User } from '../../domain/models/user.js';

export interface UserWithRestaurants {
  user: User;
  /** Vacío para admins (ven todo). */
  restaurantIds: string[];
}

/**
 * Lista todos los users del backoffice + los ids de restaurantes asignados
 * a cada editor. Los admins devuelven `restaurantIds: []` (significa "todos").
 */
export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<UserWithRestaurants[]> {
    const all = await this.users.list();
    return Promise.all(all.map(async u => ({
      user: u,
      restaurantIds: u.role === 'admin' ? [] : await this.users.listRestaurantIds(u.id)
    })));
  }
}
