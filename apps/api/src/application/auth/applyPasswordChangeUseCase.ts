import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import type { TokenGenerator, TokenKind } from '../../domain/services/tokenGenerator.js';
import type { PasswordHasher } from '../../domain/services/passwordHasher.js';
import { WeakPasswordError, InvalidCredentialsError } from '../../domain/models/user.js';
import { checkPasswordStrength } from './passwordStrength.js';

/**
 * Consume un token (reset o setup) + aplica el nuevo password:
 *  1. Consume el token (atómico — si válido, lo marca como usado).
 *  2. Valida fuerza del password con zxcvbn (reusa helper existente).
 *  3. Hashea con el `PasswordHasher` configurado.
 *  4. Si es `password_reset`, invalida TODAS las sesiones activas del user.
 *
 * Lanza `InvalidCredentialsError` si el token no es válido, o
 * `WeakPasswordError(reason)` si el password es débil.
 */
export class ApplyPasswordChangeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessionsRepo: SessionRepository,
    private readonly tokens: TokenGenerator,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: { token: string; newPassword: string; kind: TokenKind }): Promise<void> {
    const userId = await this.tokens.consume(input.token, input.kind);
    if (!userId) throw new InvalidCredentialsError();

    const user = await this.users.findById(userId);
    const check = checkPasswordStrength({
      password: input.newPassword,
      userInputs: user ? [user.email, user.name] : []
    });
    if (!check.ok) throw new WeakPasswordError(check.reason ?? 'weak_password');

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.updatePasswordHash(userId, passwordHash);

    if (input.kind === 'password_reset') {
      await this.sessionsRepo.invalidateUser(userId);
    }
  }
}
