import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import type { Session } from '../../domain/models/session.js';

/** Lista las sesiones activas de un user — para "cerrar en otro dispositivo". */
export class ListUserSessionsUseCase {
  constructor(private readonly sessionsRepo: SessionRepository) {}

  async execute(userId: string): Promise<Session[]> {
    return this.sessionsRepo.listByUser(userId);
  }
}
