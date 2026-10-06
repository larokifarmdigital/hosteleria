import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import { SessionNotFoundError } from '../../domain/models/session.js';

export class RevokeSessionUseCase {
  constructor(private readonly sessionsRepo: SessionRepository) {}

  async execute(userId: string, sessionId: string): Promise<void> {
    // Un user no puede cerrar la sesión de otro — chequeamos ownership antes.
    const active = await this.sessionsRepo.listByUser(userId);
    if (!active.some(s => s.id === sessionId)) throw new SessionNotFoundError(sessionId);
    await this.sessionsRepo.invalidate(sessionId);
  }
}
