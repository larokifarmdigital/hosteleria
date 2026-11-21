import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import type { RebuildHookCaller } from '../../domain/services/rebuildHookCaller.js';
import {
  RESTAURANT_CONTENT_KEYS,
  RestaurantNotFoundError,
  restaurantTranslatableTexts,
  type PublishState,
  type Restaurant,
  type RestaurantContent,
  type RestaurantSnapshot
} from '../../domain/models/restaurant.js';
import { assertTranslationsComplete } from '../../domain/models/i18n.js';

export interface PatchRestaurantInput extends Partial<RestaurantContent> {
  state?: PublishState;
  rebuildHookUrl?: string | null;
  defaultLocaleCode?: string;
  activeLocaleCodes?: string[];
}

export class PatchRestaurantUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly languages: LanguageRepository,
    private readonly rebuildHook: RebuildHookCaller
  ) {}

  async execute(slug: string, input: PatchRestaurantInput, actorId: string): Promise<{ id: string }> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);

    const wasPublished = r.state === 'published';
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

    // Rebuild cuando: pasó a published ahora, o ya estaba published y se
    // editó algún campo (los providers de deploy deduplican rebuilds).
    const shouldRebuild = (willBePublished && !wasPublished) || (wasPublished && input.state === undefined);
    if (shouldRebuild && r.rebuildHookUrl) {
      void this.rebuildHook.call(r.rebuildHookUrl, { restaurantSlug: r.slug });
    }

    return { id: r.id };
  }
}
