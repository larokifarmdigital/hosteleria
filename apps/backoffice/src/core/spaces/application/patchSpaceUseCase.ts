import type { SpaceRepository } from '../domain/repositories/spaceRepository';
import type { RestaurantRepository, PublishState } from '@/core/restaurants';
import { assertTranslationsComplete, DomainError } from '@/core/shared';
import {
  SPACE_CONTENT_KEYS,
  SpaceNotFoundError,
  spaceTranslatableTexts,
  type ScheduleDay,
  type Space,
  type SpaceContent,
  type SpaceSnapshot,
  type SpaceType
} from '../domain/models/space';

export class MustHaveDefaultSpaceError extends DomainError {
  readonly code = 'MUST_HAVE_DEFAULT_SPACE';
  readonly status = 400;
  constructor() {
    super('El restaurante debe tener al menos un espacio marcado como principal.');
    this.name = 'MustHaveDefaultSpaceError';
  }
}

export interface PatchSpaceInput extends Partial<SpaceContent> {
  type?: SpaceType;
  isDefault?: boolean;
  order?: number;
  state?: PublishState;
  schedule?: ScheduleDay[];
}

export class PatchSpaceUseCase {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly restaurants: RestaurantRepository
  ) {}

  /** `allowIncompleteTranslations`: publicar aunque falte traducir algo (solo «Publicar», y no la primera vez). */
  async execute(restaurantId: string, spaceId: string, input: PatchSpaceInput, actorId: string, opts: { allowIncompleteTranslations?: boolean } = {}): Promise<Space> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);

    // Invariante: siempre debe quedar exactamente 1 space default por restaurant.
    if (input.isDefault === false) {
      const siblings = await this.spaces.listByRestaurantId(restaurantId);
      const otherDefault = siblings.some(x => x.id !== spaceId && x.isDefault);
      if (!otherDefault) throw new MustHaveDefaultSpaceError();
    }

    // El contenido tal como queda tras este PATCH: lo guardado más lo que llega.
    const content = {} as Record<string, unknown>;
    const patch: Partial<Space> = {};
    for (const key of SPACE_CONTENT_KEYS) {
      content[key] = input[key] !== undefined ? input[key] : s[key];
      if (input[key] !== undefined) (patch as Record<string, unknown>)[key] = input[key];
    }

    if (input.state === 'published' && !opts.allowIncompleteTranslations) {
      const restaurant = await this.restaurants.findById(restaurantId);
      assertTranslationsComplete(spaceTranslatableTexts(content as SpaceContent), restaurant?.activeLocaleCodes ?? []);
    }

    if (input.type !== undefined) patch.type = input.type;
    if (input.order !== undefined) patch.order = input.order;
    if (input.state !== undefined) patch.state = input.state;
    if (input.isDefault !== undefined) patch.isDefault = input.isDefault;

    await this.spaces.update(spaceId, patch, actorId);

    if (input.isDefault === true) await this.spaces.clearDefaultsExcept(restaurantId, spaceId);

    if (input.state === 'published') {
      const snap: SpaceSnapshot = { ...(content as SpaceContent), schedule: input.schedule ?? s.schedule };
      await this.spaces.saveSnapshot(spaceId, snap);
    }

    if (input.schedule !== undefined) await this.spaces.replaceSchedule(spaceId, input.schedule);

    return (await this.spaces.findById(spaceId))!;
  }
}
