import type { RestaurantRepository } from '../domain/repositories/restaurantRepository';
import type { LanguageRepository } from '@/core/languages';
import {
  RESTAURANT_CONTENT_KEYS,
  RestaurantNotFoundError,
  NoSnapshotError,
  type Restaurant
} from '../domain/models/restaurant';

export class DiscardChangesUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly languages: LanguageRepository
  ) {}

  async execute(slug: string, actorId: string): Promise<{ id: string }> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    if (!r.publishedSnapshot) throw new NoSnapshotError();

    // Lo que el snapshot no trae (campos añadidos después de publicar) se
    // deja como está.
    const snap = r.publishedSnapshot;
    const patch: Partial<Restaurant> = { state: 'published' };
    for (const key of RESTAURANT_CONTENT_KEYS) {
      if (key in snap && snap[key] !== undefined) (patch as Record<string, unknown>)[key] = snap[key];
    }
    if (snap.defaultLocaleCode) patch.defaultLocaleCode = snap.defaultLocaleCode;
    await this.restaurants.update(r.id, patch, actorId);

    if (snap.activeLocaleCodes?.length) {
      await this.restaurants.replaceLocales(r.id, await this.languages.resolveCodes(snap.activeLocaleCodes));
    }

    return { id: r.id };
  }
}
