import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import {
  SpaceNotFoundError,
  CannotDeleteLastSpaceError
} from '../../domain/models/space.js';

/**
 * Hard delete de un space.
 *  - Invariante: un restaurant siempre debe tener >= 1 space.
 *  - Si el borrado era el default, promovemos otro como default (el primero
 *    de los restantes por `order`).
 */
export class DeleteSpaceUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, spaceId: string, actorId: string): Promise<void> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);

    const total = await this.spaces.countByRestaurant(restaurantId);
    if (total <= 1) throw new CannotDeleteLastSpaceError();

    await this.spaces.deleteById(spaceId);

    if (s.isDefault) {
      const remaining = await this.spaces.listByRestaurantId(restaurantId);
      const promote = remaining[0];
      if (promote) await this.spaces.update(promote.id, { isDefault: true }, actorId);
    }
  }
}
