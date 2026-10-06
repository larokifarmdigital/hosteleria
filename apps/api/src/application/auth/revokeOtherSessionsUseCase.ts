import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';

/**
 * Cierra TODAS las sesiones del user excepto la actual.
 * Devuelve el nº de sesiones cerradas.
 */
export class RevokeOtherSessionsUseCase {
  constructor(private readonly sessionsRepo: SessionRepository) {}

  async execute(userId: string, currentSessionId: string): Promise<{ closed: number }> {
    const all = await this.sessionsRepo.listByUser(userId);
    const others = all.filter(s => s.id !== currentSessionId);
    await Promise.all(others.map(s => this.sessionsRepo.invalidate(s.id)));
    return { closed: others.length };
  }
}
