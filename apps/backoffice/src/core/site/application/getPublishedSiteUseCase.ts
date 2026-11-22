import { type RestaurantRepository, RestaurantNotFoundError } from '@/core/restaurants';
import type { SpaceRepository } from '@/core/spaces';
import type { DishRepository, WineRepository } from '@/core/menu';
import type { LegalPageRepository } from '@/core/legal';
import type { MediaRepository } from '@/core/media';
import type { LanguageRepository } from '@/core/languages';
import {
  buildPublishedSite,
  publishedSiteMediaIds,
  type PublishedSite
} from '../domain/models/publishedSite';

export class GetPublishedSiteUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly dishes: DishRepository,
    private readonly wines: WineRepository,
    private readonly legalPages: LegalPageRepository,
    private readonly media: MediaRepository,
    private readonly languages: LanguageRepository,
    private readonly mediaBaseUrl: string
  ) {}

  /** Un restaurante sin publicar responde igual que uno que no existe. */
  async execute(slug: string): Promise<PublishedSite> {
    const restaurant = await this.restaurants.findBySlug(slug);
    if (!restaurant?.publishedSnapshot) throw new RestaurantNotFoundError(slug);

    const [spaces, dishes, wines, legalPages, languages] = await Promise.all([
      this.spaces.listByRestaurantId(restaurant.id),
      this.dishes.list({ restaurantSlug: slug }),
      this.wines.list({ restaurantSlug: slug }),
      this.legalPages.listByRestaurantId(restaurant.id),
      this.languages.list()
    ]);
    const published = spaces.filter(s => s.publishedSnapshot);
    const [dishCategories, wineCategories] = await Promise.all([
      Promise.all(published.map(s => this.dishes.listCategories(s.id))).then(lists => lists.flat()),
      Promise.all(published.map(s => this.wines.listCategories(s.id))).then(lists => lists.flat())
    ]);

    const sources = { restaurant, spaces, dishCategories, dishes, wineCategories, wines, legalPages, languages };
    const media = await this.media.findByIds(publishedSiteMediaIds(sources));
    return buildPublishedSite(sources, media, this.mediaBaseUrl)!;
  }
}
