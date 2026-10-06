import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { User } from '../../domain/models/user.js';

export interface UserWithRestaurants {
  user: User;
  /** Siempre `[]` para admins ("todos"); los ids explícitos solo aplican a editors. */
  restaurantIds: string[];
}

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
