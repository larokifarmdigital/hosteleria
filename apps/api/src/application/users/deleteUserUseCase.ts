import type { UserRepository } from '../../domain/repositories/userRepository.js';
import { UserNotFoundError } from '../../domain/models/user.js';
import { DomainError } from '../../domain/models/errors.js';

export class CannotDeleteSelfError extends DomainError {
  readonly code = 'CANNOT_DELETE_SELF';
  readonly status = 400;
  constructor() {
    super('No puedes borrar tu propio usuario.');
    this.name = 'CannotDeleteSelfError';
  }
}

export class DeleteUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string, actorId: string): Promise<void> {
    // Un admin no puede borrarse a sí mismo — se protege contra quedarnos
    // sin ningún admin accediendo al sistema.
    if (id === actorId) throw new CannotDeleteSelfError();
    const u = await this.users.findById(id);
    if (!u) throw new UserNotFoundError(id);
    await this.users.deleteById(id);
  }
}
