import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import { SpaceSlugTakenError, type Space, type SpaceType } from '../../domain/models/space.js';

export interface CreateSpaceInput {
  slug: string;
  name: string;
  type: SpaceType;
  descriptor: string;
  isDefault: boolean;
}

export class CreateSpaceUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, input: CreateSpaceInput): Promise<Space> {
    const existing = await this.spaces.findByRestaurantAndSlug(restaurantId, input.slug);
    if (existing) throw new SpaceSlugTakenError(input.slug);

    // Invariante: cada restaurant tiene exactamente 1 space default. El
    // primero se marca forzosamente; los siguientes solo si el body lo pide
    // (y entonces desplazan al anterior).
    const currentCount = await this.spaces.countByRestaurant(restaurantId);
    let isDefault = input.isDefault;
    if (currentCount === 0) isDefault = true;

    const space = await this.spaces.create({
      restaurantId,
      slug: input.slug,
      name: input.name,
      type: input.type,
      descriptor: input.descriptor,
      isDefault,
      order: currentCount
    });

    if (isDefault) await this.spaces.clearDefaultsExcept(restaurantId, space.id);
    return space;
  }
}
