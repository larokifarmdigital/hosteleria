import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { PasswordHasher } from '../../domain/services/passwordHasher.js';
import {
  UserNotFoundError,
  WeakPasswordError,
  type User,
  type UserRole
} from '../../domain/models/user.js';
import { checkPasswordStrength } from '../auth/passwordStrength.js';

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  avatarColor?: string;
  password?: string;
  restaurantSlugs?: string[];
}

export class UpdateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly restaurants: RestaurantRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(id: string, input: UpdateUserInput): Promise<User> {
    const u = await this.users.findById(id);
    if (!u) throw new UserNotFoundError(id);

    const patch: Partial<Pick<User, 'name' | 'role' | 'avatarColor'>> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.role !== undefined) patch.role = input.role;
    if (input.avatarColor !== undefined) patch.avatarColor = input.avatarColor;
    if (Object.keys(patch).length > 0) await this.users.update(id, patch);

    if (input.password !== undefined) {
      const check = checkPasswordStrength({
        password: input.password,
        userInputs: [u.email, input.name ?? u.name]
      });
      if (!check.ok) throw new WeakPasswordError(check.reason ?? 'weak_password');
      const passwordHash = await this.hasher.hash(input.password);
      await this.users.updatePasswordHash(id, passwordHash);
    }

    const finalRole = input.role ?? u.role;
    // Al pasar a admin vaciamos la m2m: un admin ve todo, no "tiene" restaurantes.
    if (input.restaurantSlugs !== undefined || input.role === 'admin') {
      if (finalRole === 'editor' && input.restaurantSlugs && input.restaurantSlugs.length > 0) {
        const ids = await this.resolveSlugs(input.restaurantSlugs);
        await this.users.setRestaurants(id, ids);
      } else {
        await this.users.setRestaurants(id, []);
      }
    }

    const refreshed = await this.users.findById(id);
    return refreshed!;
  }

  private async resolveSlugs(slugs: string[]): Promise<string[]> {
    const results = await Promise.all(slugs.map(s => this.restaurants.findBySlug(s)));
    return results.filter((r): r is NonNullable<typeof r> => !!r).map(r => r.id);
  }
}
