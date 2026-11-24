import type { UserRepository } from '../domain/repositories/userRepository';
import type { TokenGenerator } from '../domain/services/tokenGenerator';
import { type EmailSender, passwordResetTemplate } from '@/core/shared';

/** Siempre resuelve sin lanzar, para no filtrar si el email está en BD.
 *  Al emitir un token nuevo se invalidan los previos. */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenGenerator,
    private readonly email: EmailSender,
    private readonly appUrl: string
  ) {}

  async execute(emailAddress: string): Promise<void> {
    const user = await this.users.findByEmail(emailAddress);
    if (!user) return;

    await this.tokens.invalidateAll(user.id, 'password_reset');
    const token = await this.tokens.create({
      userId: user.id,
      kind: 'password_reset',
      ttlSeconds: 60 * 60
    });
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;
    const tpl = passwordResetTemplate({ name: user.name, resetUrl });
    void this.email
      .send({ to: user.email, ...tpl })
      .catch(err => console.error('[auth] forgot email failed:', err));
  }
}
