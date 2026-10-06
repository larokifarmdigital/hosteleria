import type { UserRepository } from '../../domain/repositories/userRepository.js';
import { UserNotFoundError } from '../../domain/models/user.js';

export class CannotDeleteSelfError extends Error {
  constructor() { super('cannot_delete_self'); this.name = 'CannotDeleteSelfError'; }
}

/**
 * Hard delete del user. Un admin NO puede borrarse a sí mismo (invariant
 * del sistema: siempre debe quedar al menos un admin disponible).
 */
export class DeleteUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string, actorId: string): Promise<void> {
    if (id === actorId) throw new CannotDeleteSelfError();
    const u = await this.users.findById(id);
    if (!u) throw new UserNotFoundError(id);
    await this.users.deleteById(id);
  }
}
