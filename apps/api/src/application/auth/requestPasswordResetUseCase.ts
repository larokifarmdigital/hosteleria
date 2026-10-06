import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { TokenGenerator } from '../../domain/services/tokenGenerator.js';
import type { EmailSender } from '../../domain/services/emailSender.js';
import { passwordResetTemplate } from '../../email/templates.js';

/**
 * Idempotente: siempre resuelve sin lanzar — no filtramos si el email
 * está en BD. Al emitir un nuevo token se invalidan los previos para
 * que solo el último sirva (seguridad en caso de reenvío).
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
