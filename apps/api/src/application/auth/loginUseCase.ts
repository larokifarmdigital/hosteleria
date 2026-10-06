import { createHash } from 'node:crypto';
import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import type { PasswordHasher } from '../../domain/services/passwordHasher.js';
import { InvalidCredentialsError, toSessionUser } from '../../domain/models/user.js';
import type { SessionUser } from '../../domain/models/user.js';

/**
 * Valida email+password y crea una sesión Lucia.
 *
 * Comparación timing-constant: incluso si el user no existe, corremos
 * `verify` contra `dummyHash` para no filtrar en el timing si un email
 * está en BD.
 *
 * Side effects post-login (fire-and-forget):
 *  - Enriquece la fila de session con userAgent + hash SHA-256 de la IP.
 *  - `touchLastAccess` del user (lo hace el repo).
 */
export interface LoginMetadata {
  ip: string;
  userAgent: string | null;
}

export interface LoginResult {
  user: SessionUser;
  cookieHeader: string;
}

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessionsRepo: SessionRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: { email: string; password: string }, metadata: LoginMetadata): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email);
    const hash = user?.passwordHash ?? this.hasher.dummyHash;
    const ok = await this.hasher.verify(input.password, hash).catch(() => false);
    if (!user || !ok) throw new InvalidCredentialsError();

    const { session, cookieHeader } = await this.sessionsRepo.create(user.id);

    // Enriquecer la fila con metadata (user agent + hash de IP — GDPR).
    const ipHash = createHash('sha256').update(metadata.ip).digest('hex').slice(0, 16);
    await this.sessionsRepo.enrichMetadata(session.id, {
      userAgent: metadata.userAgent,
      ipHash
    });

    void this.users.touchLastAccess(user.id);

    return { user: toSessionUser(user), cookieHeader };
  }
}
