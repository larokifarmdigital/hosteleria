import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import { SpaceNotFoundError, type Space } from '../../domain/models/space.js';

/**
 * Devuelve el space por id y verifica que pertenece al restaurant indicado
 * (defensa en profundidad contra traversal de restaurant ajeno).
 */
export class GetSpaceUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, spaceId: string): Promise<Space> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);
    return s;
  }
}
