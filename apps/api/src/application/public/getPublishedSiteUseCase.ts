import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import type { LegalPageRepository } from '../../domain/repositories/legalPageRepository.js';
import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import { RestaurantNotFoundError } from '../../domain/models/restaurant.js';
import {
  buildPublishedSite,
  publishedSiteMediaIds,
  type PublishedSite
} from '../../domain/models/publishedSite.js';

export class GetPublishedSiteUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly dishes: DishRepository,
    private readonly wines: WineRepository,
    private readonly legalPages: LegalPageRepository,
    private readonly media: MediaRepository,
    private readonly mediaBaseUrl: string
  ) {}

  /** Un restaurante sin publicar responde igual que uno que no existe. */
  async execute(slug: string): Promise<PublishedSite> {
    const restaurant = await this.restaurants.findBySlug(slug);
    if (!restaurant?.publishedSnapshot) throw new RestaurantNotFoundError(slug);

    const [spaces, dishes, wines, legalPages] = await Promise.all([
      this.spaces.listByRestaurantId(restaurant.id),
      this.dishes.list({ restaurantSlug: slug }),
      this.wines.list({ restaurantSlug: slug }),
      this.legalPages.listByRestaurantId(restaurant.id)
    ]);
    const published = spaces.filter(s => s.publishedSnapshot);
    const [dishCategories, wineCategories] = await Promise.all([
      Promise.all(published.map(s => this.dishes.listCategories(s.id))).then(lists => lists.flat()),
      Promise.all(published.map(s => this.wines.listCategories(s.id))).then(lists => lists.flat())
    ]);

    const sources = { restaurant, spaces, dishCategories, dishes, wineCategories, wines, legalPages };
    const media = await this.media.findByIds(publishedSiteMediaIds(sources));
    return buildPublishedSite(sources, media, this.mediaBaseUrl)!;
  }
}
