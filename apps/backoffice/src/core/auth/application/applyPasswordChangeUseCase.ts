import type { UserRepository } from '../domain/repositories/userRepository';
import type { SessionRepository } from '../domain/repositories/sessionRepository';
import { InvalidTokenError, type TokenGenerator, type TokenKind } from '../domain/services/tokenGenerator';
import type { PasswordHasher } from '../domain/services/passwordHasher';
import { WeakPasswordError } from '../domain/models/user';
import { checkPasswordStrength } from './passwordStrength';

export class ApplyPasswordChangeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessionsRepo: SessionRepository,
    private readonly tokens: TokenGenerator,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: { token: string; newPassword: string; kind: TokenKind }): Promise<void> {
    // La contraseña se comprueba antes de gastar el enlace: si no vale, la
    // persona puede volver a intentarlo con el mismo enlace.
    const owner = await this.tokens.peek(input.token, input.kind);
    if (!owner) throw new InvalidTokenError();
    const user = await this.users.findById(owner);
    const check = checkPasswordStrength({
      password: input.newPassword,
      userInputs: user ? [user.email, user.name] : []
    });
    if (!check.ok) throw new WeakPasswordError(check.reason ?? 'weak_password');

    const userId = await this.tokens.consume(input.token, input.kind);
    if (!userId) throw new InvalidTokenError();

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.updatePasswordHash(userId, passwordHash);

    // En reset cerramos sesiones activas (seguridad); en setup no hay aún.
    if (input.kind === 'password_reset') {
      await this.sessionsRepo.invalidateUser(userId);
    }
  }
}
