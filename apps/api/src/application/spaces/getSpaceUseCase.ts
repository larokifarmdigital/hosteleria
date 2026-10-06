import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import { SpaceNotFoundError, type Space } from '../../domain/models/space.js';

export class GetSpaceUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, spaceId: string): Promise<Space> {
    // Defensa en profundidad: aunque la ruta ya chequea permisos sobre
    // `:slug`, confirmamos que el space pertenece a ese restaurant.
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);
    return s;
  }
}
