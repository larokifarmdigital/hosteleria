import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import { InvalidTokenError, type TokenGenerator, type TokenKind } from '../../domain/services/tokenGenerator.js';
import type { PasswordHasher } from '../../domain/services/passwordHasher.js';
import { WeakPasswordError } from '../../domain/models/user.js';
import { checkPasswordStrength } from './passwordStrength.js';

export class ApplyPasswordChangeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessionsRepo: SessionRepository,
    private readonly tokens: TokenGenerator,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: { token: string; newPassword: string; kind: TokenKind }): Promise<void> {
    const userId = await this.tokens.consume(input.token, input.kind);
    if (!userId) throw new InvalidTokenError();

    const user = await this.users.findById(userId);
    const check = checkPasswordStrength({
      password: input.newPassword,
      userInputs: user ? [user.email, user.name] : []
    });
    if (!check.ok) throw new WeakPasswordError(check.reason ?? 'weak_password');

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.updatePasswordHash(userId, passwordHash);

    // En reset cerramos sesiones activas (seguridad); en setup no hay aún.
    if (input.kind === 'password_reset') {
      await this.sessionsRepo.invalidateUser(userId);
    }
  }
}
