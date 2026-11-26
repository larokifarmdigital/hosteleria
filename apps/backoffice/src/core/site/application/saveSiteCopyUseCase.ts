import { type RestaurantRepository, RestaurantNotFoundError } from '@/core/restaurants';
import { buildPublishedSite } from '../domain/models/publishedSite';
import type { PublishedSiteRepository } from '../domain/repositories/publishedSiteRepository';
import type { SiteSourcesLoader } from './siteSources';

/**
 * Guarda como publicada la web tal como está ahora en el backoffice: ficha y espacios
 * (ya publicados), carta, vinos, legales y fotos. Va siempre detrás de publicar.
 */
export class SaveSiteCopyUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly copies: PublishedSiteRepository,
    private readonly sources: SiteSourcesLoader,
    private readonly mediaBaseUrl: string
  ) {}

  /** `changed`: la web que se ve es distinta de la de antes (hay que regenerarla). */
  async execute(slug: string, actorId: string | null): Promise<{ changed: boolean }> {
    const restaurant = await this.restaurants.findBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError(slug);
    if (!restaurant.publishedSnapshot) return { changed: false };
    const before = await this.copies.find(restaurant.id);
    const copy = await this.sources.toCopy(await this.sources.load(restaurant));
    await this.copies.save(restaurant.id, copy, actorId);
    const view = (c: typeof copy) => {
      const site = buildPublishedSite(c, c.media, this.mediaBaseUrl);
      // La fecha de publicación cambia siempre: no cuenta como cambio de la web.
      return JSON.stringify(site ? { ...site, restaurant: { ...site.restaurant, publishedAt: null } } : null);
    };
    return { changed: !before || view(before.copy) !== view(copy) };
  }
}
