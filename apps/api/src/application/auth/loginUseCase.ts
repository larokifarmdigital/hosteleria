import { createHash } from 'node:crypto';
import type { UserRepository } from '../../domain/repositories/userRepository.js';
import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import type { PasswordHasher } from '../../domain/services/passwordHasher.js';
import { InvalidCredentialsError, toSessionUser } from '../../domain/models/user.js';
import type { SessionUser } from '../../domain/models/user.js';

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
    // Timing-constant: aunque el user no exista, verificamos contra el
    // dummyHash para no filtrar por tiempo si un email está en BD.
    const user = await this.users.findByEmail(input.email);
    const hash = user?.passwordHash ?? this.hasher.dummyHash;
    const ok = await this.hasher.verify(input.password, hash).catch(() => false);
    if (!user || !ok) throw new InvalidCredentialsError();

    const { session, cookieHeader } = await this.sessionsRepo.create(user.id);

    // IP cruda nunca se persiste (GDPR); solo SHA-256 truncado.
    const ipHash = createHash('sha256').update(metadata.ip).digest('hex').slice(0, 16);
    await this.sessionsRepo.enrichMetadata(session.id, {
      userAgent: metadata.userAgent,
      ipHash
    });

    void this.users.touchLastAccess(user.id);

    return { user: toSessionUser(user), cookieHeader };
  }
}
