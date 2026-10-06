import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import { SessionNotFoundError } from '../../domain/models/session.js';

/**
 * Cierra UNA sesión. Verifica que la sesión pertenece al user que la pide
 * — un user no puede cerrar la sesión de otro.
 */
export class RevokeSessionUseCase {
  constructor(private readonly sessionsRepo: SessionRepository) {}

  async execute(userId: string, sessionId: string): Promise<void> {
    const active = await this.sessionsRepo.listByUser(userId);
    const owned = active.some(s => s.id === sessionId);
    if (!owned) throw new SessionNotFoundError(sessionId);
    await this.sessionsRepo.invalidate(sessionId);
  }
}
