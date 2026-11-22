import type { RestaurantRepository } from '../domain/repositories/restaurantRepository';
import type { LanguageRepository } from '@/core/languages';
import {
  RESTAURANT_CONTENT_KEYS,
  RestaurantNotFoundError,
  restaurantTranslatableTexts,
  type PublishState,
  type Restaurant,
  type RestaurantContent,
  type RestaurantSnapshot
} from '../domain/models/restaurant';
import { assertTranslationsComplete } from '@/core/shared';

export interface PatchRestaurantInput extends Partial<RestaurantContent> {
  state?: PublishState;
  rebuildHookUrl?: string | null;
  defaultLocaleCode?: string;
  activeLocaleCodes?: string[];
}

export class PatchRestaurantUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly languages: LanguageRepository
  ) {}

  async execute(slug: string, input: PatchRestaurantInput, actorId: string): Promise<{ id: string }> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);

    const willBePublished = input.state === 'published';

    // El contenido tal como queda tras este PATCH: lo guardado más lo que llega.
    const content = {} as Record<string, unknown>;
    const patch: Partial<Restaurant> = {};
    for (const key of RESTAURANT_CONTENT_KEYS) {
      content[key] = input[key] !== undefined ? input[key] : r[key];
      if (input[key] !== undefined) (patch as Record<string, unknown>)[key] = input[key];
    }
    const activeLocaleCodes = input.activeLocaleCodes ?? r.activeLocaleCodes;
    const defaultLocaleCode = input.defaultLocaleCode ?? r.defaultLocaleCode;

    if (willBePublished) {
      assertTranslationsComplete(restaurantTranslatableTexts(content as RestaurantContent), activeLocaleCodes);
    }

    if (input.rebuildHookUrl !== undefined) patch.rebuildHookUrl = input.rebuildHookUrl;
    if (input.state !== undefined) patch.state = input.state;
    if (input.defaultLocaleCode !== undefined) patch.defaultLocaleCode = input.defaultLocaleCode;

    await this.restaurants.update(r.id, patch, actorId);

    // Lo publicado: es lo que leerá la web y lo que `discardChanges`
    // restaurará si el editor se arrepiente.
    if (willBePublished) {
      const snapshot: RestaurantSnapshot = { ...(content as RestaurantContent), activeLocaleCodes, defaultLocaleCode };
      await this.restaurants.saveSnapshot(r.id, snapshot, new Date());
    }

    if (input.activeLocaleCodes) {
      const activeIds = await this.languages.resolveCodes(input.activeLocaleCodes);
      await this.restaurants.replaceLocales(r.id, activeIds);
    }

    return { id: r.id };
  }
}
