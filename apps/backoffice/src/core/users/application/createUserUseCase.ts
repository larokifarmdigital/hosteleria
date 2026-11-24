import {
  type UserRepository,
  type PasswordHasher,
  type TokenGenerator,
  EmailTakenError,
  WeakPasswordError,
  type User,
  type UserRole,
  checkPasswordStrength
} from '@/core/auth';
import type { RestaurantRepository } from '@/core/restaurants';
import { type EmailSender, welcomeTemplate } from '@/core/shared';

export const INVITATION_TTL_SECONDS = 60 * 60 * 48;

export interface Invitation {
  /** En claro: solo existe en esta respuesta. Con él se compone el enlace `/set-password?token=`. */
  token: string;
  expiresAt: Date;
}

/** Crea el enlace de un solo uso para elegir contraseña y lo manda por correo. Los anteriores dejan de valer. */
export async function issueInvitation(deps: {
  user: User; inviterName: string; tokens: TokenGenerator; email: EmailSender; appUrl: string;
}): Promise<Invitation> {
  const { user, inviterName, tokens, email, appUrl } = deps;
  await tokens.invalidateAll(user.id, 'password_setup');
  const token = await tokens.create({ userId: user.id, kind: 'password_setup', ttlSeconds: INVITATION_TTL_SECONDS });
  const setupUrl = `${appUrl}/set-password?token=${token}`;
  const tpl = welcomeTemplate({ name: user.name, setupUrl, invitedBy: inviterName });
  void email.send({ to: user.email, ...tpl }).catch(err => console.error('[users] welcome email failed:', err));
  return { token, expiresAt: new Date(Date.now() + INVITATION_TTL_SECONDS * 1000) };
}

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

  /** `invitation` trae el token para que el usuario elija su contraseña; `null` si se dio una. */
  async execute(input: CreateUserInput, inviterName: string): Promise<{ user: User; invitation: Invitation | null }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new EmailTakenError(input.email);

    if (input.password) {
      const check = checkPasswordStrength({
        password: input.password,
        userInputs: [input.email, input.name]
      });
      if (!check.ok) throw new WeakPasswordError(check.reason ?? 'weak_password');
    }

    // Sin password viene con welcome email: hasheamos un random impracticable
    // de crackear para que la cuenta quede bloqueada hasta que el user
    // consuma el token `password_setup`.
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

    const invitation = input.password
      ? null
      : await issueInvitation({ user, inviterName, tokens: this.tokens, email: this.email, appUrl: this.appUrl });
    return { user, invitation };
  }

  private async resolveSlugs(slugs: string[]): Promise<string[]> {
    const results = await Promise.all(slugs.map(s => this.restaurants.findBySlug(s)));
    return results.filter((r): r is NonNullable<typeof r> => !!r).map(r => r.id);
  }
}
