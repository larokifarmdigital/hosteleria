import { type RestaurantRepository, RestaurantNotFoundError } from '@/core/restaurants';
import { buildPublishedSite, type PublishedSite } from '../domain/models/publishedSite';
import type { PublishedSiteRepository } from '../domain/repositories/publishedSiteRepository';
import type { SiteSourcesLoader } from './siteSources';

/**
 * La web publicada: se construye desde la copia que se guardó al pulsar «Publicar».
 * Lo que se ha cambiado después (carta, legales, orden de espacios) no sale hasta publicar otra vez.
 */
export class GetPublishedSiteUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly copies: PublishedSiteRepository,
    private readonly sources: SiteSourcesLoader,
    private readonly mediaBaseUrl: string
  ) {}

  /** Un restaurante sin publicar responde igual que uno que no existe. */
  async execute(slug: string): Promise<PublishedSite> {
    const restaurant = await this.restaurants.findBySlug(slug);
    if (!restaurant?.publishedSnapshot) throw new RestaurantNotFoundError(slug);
    const stored = await this.copies.find(restaurant.id);
    // Restaurantes publicados antes de que existiera la copia: se calcula como antes
    // hasta que se publiquen otra vez.
    const copy = stored?.copy ?? await this.sources.toCopy(await this.sources.load(restaurant));
    return buildPublishedSite(copy, copy.media, this.mediaBaseUrl)!;
  }
}
