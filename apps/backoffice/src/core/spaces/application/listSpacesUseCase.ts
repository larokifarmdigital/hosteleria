import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import type { Space } from '../../domain/models/space.js';

export class ListSpacesUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantSlug: string): Promise<Space[]> {
    return this.spaces.listByRestaurantSlug(restaurantSlug);
  }
}
