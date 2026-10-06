import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import { SpaceSlugTakenError, type Space, type SpaceType } from '../../domain/models/space.js';

/**
 * Crea un space dentro de un restaurant.
 *
 *  - Slug único por restaurant (lanza `SpaceSlugTakenError` si colisiona).
 *  - Si es el primer space del restaurant, se fuerza `isDefault = true`.
 *  - Si viene `isDefault=true`, se quita el default a los demás (invariante:
 *    siempre debe haber exactamente 1 default por restaurant).
 *  - `order` = nº de spaces existentes (siguiente en la lista).
 */
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
