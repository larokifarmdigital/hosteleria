import type { SessionRepository } from '../../domain/repositories/sessionRepository.js';
import type { Session } from '../../domain/models/session.js';

export class ListUserSessionsUseCase {
  constructor(private readonly sessionsRepo: SessionRepository) {}

  async execute(userId: string): Promise<Session[]> {
    return this.sessionsRepo.listByUser(userId);
  }
}
