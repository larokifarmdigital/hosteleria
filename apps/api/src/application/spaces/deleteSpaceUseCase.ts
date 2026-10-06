import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import {
  SpaceNotFoundError,
  CannotDeleteLastSpaceError
} from '../../domain/models/space.js';

export class DeleteSpaceUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, spaceId: string, actorId: string): Promise<void> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);

    // Invariantes del dominio: >= 1 space por restaurant, y exactamente 1
    // default — si borramos el default, promovemos el primero por `order`.
    const total = await this.spaces.countByRestaurant(restaurantId);
    if (total <= 1) throw new CannotDeleteLastSpaceError();

    await this.spaces.deleteById(spaceId);

    if (s.isDefault) {
      const [promote] = await this.spaces.listByRestaurantId(restaurantId);
      if (promote) await this.spaces.update(promote.id, { isDefault: true }, actorId);
    }
  }
}
