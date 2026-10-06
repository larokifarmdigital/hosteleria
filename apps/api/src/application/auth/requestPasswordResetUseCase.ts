import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { TokenGenerator } from '../../domain/services/tokenGenerator.js';
import type { EmailSender } from '../../domain/services/emailSender.js';
import { passwordResetTemplate } from '../../email/templates.js';

/**
 * Pide un reset de password — idempotente, no revela si el email está en BD.
 *
 * Si el user existe:
 *  1. Invalida todos los tokens `password_reset` previos (solo el último sirve).
 *  2. Genera un nuevo token con TTL 1h.
 *  3. Envía email con el link `appUrl/reset-password?token=…`.
 */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenGenerator,
    private readonly email: EmailSender,
    private readonly appUrl: string
  ) {}

  async execute(emailAddress: string): Promise<void> {
    const user = await this.users.findByEmail(emailAddress);
    if (!user) return; // silencio total — no filtramos si el email existe

    await this.tokens.invalidateAll(user.id, 'password_reset');
    const token = await this.tokens.create({
      userId: user.id,
      kind: 'password_reset',
      ttlSeconds: 60 * 60
    });
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;
    const tpl = passwordResetTemplate({ name: user.name, resetUrl });
    // Fire-and-forget: no bloqueamos la response.
    void this.email
      .send({ to: user.email, ...tpl })
      .catch(err => console.error('[auth] forgot email failed:', err));
  }
}
