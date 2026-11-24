import {
  type UserRepository,
  type PasswordHasher,
  type SessionRepository,
  CannotLockSelfOutError,
  UserNotFoundError,
  WeakPasswordError,
  type User,
  type UserRole,
  checkPasswordStrength
} from '@/core/auth';
import type { RestaurantRepository } from '@/core/restaurants';

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  avatarColor?: string;
  password?: string;
  restaurantSlugs?: string[];
  /** `true` suspende la cuenta y cierra sus sesiones; `false` la reactiva. */
  suspended?: boolean;
}

export class UpdateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly restaurants: RestaurantRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionRepository
  ) {}

  async execute(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
    const u = await this.users.findById(id);
    if (!u) throw new UserNotFoundError(id);
    if (id === actorId && (input.suspended === true || (input.role !== undefined && input.role !== 'admin'))) {
      throw new CannotLockSelfOutError();
    }

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
      // Quien entraba con la contraseña anterior deja de poder hacerlo.
      await this.sessions.invalidateUser(id);
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

    if (input.suspended !== undefined && input.suspended !== !!u.suspendedAt) {
      await this.users.setSuspended(id, input.suspended ? new Date() : null);
      // Quien ya estaba dentro sale en su siguiente petición.
      if (input.suspended) await this.sessions.invalidateUser(id);
    }

    const refreshed = await this.users.findById(id);
    return refreshed!;
  }

  private async resolveSlugs(slugs: string[]): Promise<string[]> {
    const results = await Promise.all(slugs.map(s => this.restaurants.findBySlug(s)));
    return results.filter((r): r is NonNullable<typeof r> => !!r).map(r => r.id);
  }
}
