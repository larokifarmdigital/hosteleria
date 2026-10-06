import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';

/**
 * Invalida la sesión actual + devuelve el header `Set-Cookie` blank para
 * borrar la cookie del browser.
 */
export class LogoutUseCase {
  constructor(private readonly sessionsRepo: SessionRepository) {}

  async execute(sessionId: string | null): Promise<{ cookieHeader: string }> {
    if (sessionId) await this.sessionsRepo.invalidate(sessionId);
    return { cookieHeader: this.sessionsRepo.blankCookieHeader() };
  }
}
