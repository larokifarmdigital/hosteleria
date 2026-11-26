import type { UserRepository } from '../domain/repositories/userRepository';
import type { SessionRepository } from '../domain/repositories/sessionRepository';
import type { PasswordHasher } from '../domain/services/passwordHasher';
import { DomainError } from '@/core/shared/domain';
import { UserNotFoundError, WeakPasswordError, toSessionUser, type SessionUser } from '../domain/models/user';
import { checkPasswordStrength } from './passwordStrength';

/** Cada persona cambia su nombre desde «Mi cuenta». El rol, los restaurantes y la suspensión los cambia un administrador. */
export class UpdateOwnProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, input: { name: string }): Promise<SessionUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    const name = input.name.trim();
    if (name !== user.name) await this.users.update(userId, { name });
    return toSessionUser({ ...user, name });
  }
}

/**
 * Cambiar la contraseña sabiendo la actual. Si no se pidiera la actual, quien
 * encontrase una sesión abierta podría quedarse con la cuenta.
 */
export class ChangeOwnPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessionsRepo: SessionRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(userId: string, currentSessionId: string, input: { currentPassword: string; newPassword: string }): Promise<{ closedSessions: number }> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    const ok = await this.hasher.verify(input.currentPassword, user.passwordHash).catch(() => false);
    if (!ok) throw new WrongCurrentPasswordError();

    const check = checkPasswordStrength({ password: input.newPassword, userInputs: [user.email, user.name] });
    if (!check.ok) throw new WeakPasswordError(check.reason ?? 'weak_password');

    await this.users.updatePasswordHash(userId, await this.hasher.hash(input.newPassword));
    // Se queda abierta la sesión desde la que se cambia; las demás (otro móvil, otro ordenador) se cierran.
    const others = (await this.sessionsRepo.listByUser(userId)).filter(s => s.id !== currentSessionId);
    await Promise.all(others.map(s => this.sessionsRepo.invalidate(s.id)));
    return { closedSessions: others.length };
  }
}

/** La persona ya ha entrado: no es un 401 (eso la sacaría de la sesión), solo un dato mal escrito. */
export class WrongCurrentPasswordError extends DomainError {
  readonly code = 'WRONG_CURRENT_PASSWORD';
  readonly status = 400;
  constructor() {
    super('La contraseña actual no es correcta.');
    this.name = 'WrongCurrentPasswordError';
  }
}
