import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import {
  SpaceNotFoundError,
  type Hero,
  type Manifesto,
  type ScheduleDay,
  type Space,
  type SpaceSnapshot,
  type SpaceType
} from '../../domain/models/space.js';
import type { PublishState } from '../../domain/models/restaurant.js';

export class MustHaveDefaultSpaceError extends Error {
  constructor() { super('must_have_default_space'); this.name = 'MustHaveDefaultSpaceError'; }
}

/**
 * Patch de un space.
 *
 *  - Si `state=published`, guarda snapshot combinando campos del body con los existentes.
 *  - Si `isDefault=true`, limpia default de los otros spaces.
 *  - Si `isDefault=false`, requiere que haya otro space con `isDefault=true` (invariante).
 *  - Si `schedule` viene, reemplaza TODO el schedule del space.
 */
export interface PatchSpaceInput {
  name?: string;
  type?: SpaceType;
  descriptor?: string;
  isDefault?: boolean;
  order?: number;
  coverGradient?: string;
  state?: PublishState;
  hero?: Hero;
  manifesto?: Manifesto;
  schedule?: ScheduleDay[];
}

export class PatchSpaceUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, spaceId: string, input: PatchSpaceInput, actorId: string): Promise<Space> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);

    // Guard: no permitir dejar al restaurant sin default space.
    if (input.isDefault === false) {
      const siblings = await this.spaces.listByRestaurantId(restaurantId);
      const otherDefault = siblings.some(x => x.id !== spaceId && x.isDefault);
      if (!otherDefault) throw new MustHaveDefaultSpaceError();
    }

    const patch: Partial<Space> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.type !== undefined) patch.type = input.type;
    if (input.descriptor !== undefined) patch.descriptor = input.descriptor;
    if (input.order !== undefined) patch.order = input.order;
    if (input.coverGradient !== undefined) patch.coverGradient = input.coverGradient;
    if (input.state !== undefined) patch.state = input.state;
    if (input.hero !== undefined) patch.hero = input.hero;
    if (input.manifesto !== undefined) patch.manifesto = input.manifesto;
    if (input.isDefault !== undefined) patch.isDefault = input.isDefault;

    await this.spaces.update(spaceId, patch, actorId);

    // Promover a default único si procede.
    if (input.isDefault === true) await this.spaces.clearDefaultsExcept(restaurantId, spaceId);

    // Snapshot al publicar.
    if (input.state === 'published') {
      const snap: SpaceSnapshot = {
        hero: input.hero ?? s.hero,
        manifesto: input.manifesto ?? s.manifesto,
        descriptor: input.descriptor ?? s.descriptor,
        coverGradient: input.coverGradient ?? s.coverGradient
      };
      await this.spaces.saveSnapshot(spaceId, snap);
    }

    // Reemplazo del schedule (atómico en el adapter).
    if (input.schedule !== undefined) await this.spaces.replaceSchedule(spaceId, input.schedule);

    return (await this.spaces.findById(spaceId))!;
  }
}
