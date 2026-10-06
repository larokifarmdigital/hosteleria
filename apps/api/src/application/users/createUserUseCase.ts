import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { PasswordHasher } from '../../domain/services/passwordHasher.js';
import type { TokenGenerator } from '../../domain/services/tokenGenerator.js';
import type { EmailSender } from '../../domain/services/emailSender.js';
import { EmailTakenError, WeakPasswordError, type User, type UserRole } from '../../domain/models/user.js';
import { checkPasswordStrength } from '../auth/passwordStrength.js';
import { welcomeTemplate } from '../../email/templates.js';

/**
 * Admin crea un user del backoffice.
 *
 *  - Si viene `password`: valida fuerza y hashea → user puede loguearse directamente.
 *  - Si no viene: hashea un placeholder random no-crackeable + emite token
 *    `password_setup` (TTL 48h) + envía welcome email con link.
 *
 * Para editors con restaurantes asignados, se resuelven slugs → ids y se
 * popula la m2m `user_restaurants`.
 */
export interface CreateUserInput {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  restaurantSlugs: string[];
}

export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly restaurants: RestaurantRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenGenerator,
    private readonly email: EmailSender,
    private readonly appUrl: string
  ) {}

  async execute(input: CreateUserInput, inviterName: string): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new EmailTakenError(input.email);

    if (input.password) {
      const check = checkPasswordStrength({
        password: input.password,
        userInputs: [input.email, input.name]
      });
      if (!check.ok) throw new WeakPasswordError(check.reason ?? 'weak_password');
    }

    // Placeholder random si no vino password — el user lo setea via welcome link.
    const rawForHash = input.password ?? (crypto.randomUUID() + crypto.randomUUID());
    const passwordHash = await this.hasher.hash(rawForHash);

    const user = await this.users.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      avatarColor: input.avatarColor
    });

    if (input.role === 'editor' && input.restaurantSlugs.length > 0) {
      const ids = await this.resolveSlugs(input.restaurantSlugs);
      if (ids.length > 0) await this.users.setRestaurants(user.id, ids);
    }

    if (!input.password) {
      const token = await this.tokens.create({
        userId: user.id,
        kind: 'password_setup',
        ttlSeconds: 60 * 60 * 48
      });
      const setupUrl = `${this.appUrl}/set-password?token=${token}`;
      const tpl = welcomeTemplate({ name: input.name, setupUrl, invitedBy: inviterName });
      void this.email.send({ to: input.email, ...tpl })
        .catch(err => console.error('[users] welcome email failed:', err));
    }

    return user;
  }

  private async resolveSlugs(slugs: string[]): Promise<string[]> {
    const results = await Promise.all(slugs.map(s => this.restaurants.findBySlug(s)));
    return results.filter((r): r is NonNullable<typeof r> => !!r).map(r => r.id);
  }
}
