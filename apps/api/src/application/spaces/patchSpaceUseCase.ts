import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import { assertTranslationsComplete } from '../../domain/models/i18n.js';
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
import { DomainError } from '../../domain/models/errors.js';

export class MustHaveDefaultSpaceError extends DomainError {
  readonly code = 'MUST_HAVE_DEFAULT_SPACE';
  readonly status = 400;
  constructor() {
    super('El restaurante debe tener al menos un espacio marcado como principal.');
    this.name = 'MustHaveDefaultSpaceError';
  }
}

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
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly restaurants: RestaurantRepository
  ) {}

  async execute(restaurantId: string, spaceId: string, input: PatchSpaceInput, actorId: string): Promise<Space> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);

    // Invariante: siempre debe quedar exactamente 1 space default por restaurant.
    if (input.isDefault === false) {
      const siblings = await this.spaces.listByRestaurantId(restaurantId);
      const otherDefault = siblings.some(x => x.id !== spaceId && x.isDefault);
      if (!otherDefault) throw new MustHaveDefaultSpaceError();
    }

    if (input.state === 'published') {
      const restaurant = await this.restaurants.findById(restaurantId);
      const hero = input.hero ?? s.hero;
      const manifesto = input.manifesto ?? s.manifesto;
      assertTranslationsComplete({
        'Título de la portada': hero?.title,
        'Subtítulo de la portada': hero?.subtitle,
        'Texto breve de la portada': hero?.note,
        'Dato a la izquierda': hero?.metaLeft,
        'Dato a la derecha': hero?.metaRight,
        'Texto del botón': hero?.cta,
        // Sin foto, su descripción no se enseña.
        ...(hero?.imageAssetId ? { 'Descripción de la foto': hero.imageAlt } : {}),
        'Antetítulo de la presentación': manifesto?.eyebrow,
        'Texto de presentación': manifesto?.text
      }, restaurant?.activeLocaleCodes ?? []);
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

    if (input.isDefault === true) await this.spaces.clearDefaultsExcept(restaurantId, spaceId);

    if (input.state === 'published') {
      const snap: SpaceSnapshot = {
        name: input.name ?? s.name,
        schedule: input.schedule ?? s.schedule,
        hero: input.hero ?? s.hero,
        manifesto: input.manifesto ?? s.manifesto,
        descriptor: input.descriptor ?? s.descriptor,
        coverGradient: input.coverGradient ?? s.coverGradient
      };
      await this.spaces.saveSnapshot(spaceId, snap);
    }

    if (input.schedule !== undefined) await this.spaces.replaceSchedule(spaceId, input.schedule);

    return (await this.spaces.findById(spaceId))!;
  }
}
