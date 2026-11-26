import type { Restaurant } from '@/core/restaurants';
import type { SpaceRepository } from '@/core/spaces';
import type { DishRepository, WineRepository } from '@/core/menu';
import type { LegalPageRepository } from '@/core/legal';
import type { MediaRepository } from '@/core/media';
import type { LanguageRepository } from '@/core/languages';
import { publishedSiteMediaIds, type PublishedSiteSources } from '../domain/models/publishedSite';
import type { SiteCopy } from '../domain/models/siteCopy';

/** Lee de la BD todo lo que hace falta para construir la web de un restaurante (el borrador de hoy). */
export class SiteSourcesLoader {
  constructor(
    private readonly spaces: SpaceRepository,
    private readonly dishes: DishRepository,
    private readonly wines: WineRepository,
    private readonly legalPages: LegalPageRepository,
    private readonly media: MediaRepository,
    private readonly languages: LanguageRepository
  ) {}

  async load(restaurant: Restaurant): Promise<PublishedSiteSources> {
    const [spaces, dishes, wines, legalPages, languages] = await Promise.all([
      this.spaces.listByRestaurantId(restaurant.id),
      this.dishes.list({ restaurantSlug: restaurant.slug }),
      this.wines.list({ restaurantSlug: restaurant.slug }),
      this.legalPages.listByRestaurantId(restaurant.id),
      this.languages.list()
    ]);
    const [dishCategories, wineCategories] = await Promise.all([
      Promise.all(spaces.map(s => this.dishes.listCategories(s.id))).then(lists => lists.flat()),
      Promise.all(spaces.map(s => this.wines.listCategories(s.id))).then(lists => lists.flat())
    ]);
    return { restaurant, spaces, dishCategories, dishes, wineCategories, wines, legalPages, languages };
  }

  /**
   * La copia que se guarda al publicar: solo los espacios publicados y su carta
   * (con lo oculto, para poder volver a ello), y las fotos que la web usa.
   */
  async toCopy(src: PublishedSiteSources): Promise<SiteCopy> {
    const spaces = src.spaces.filter(s => s.publishedSnapshot);
    const ids = new Set(spaces.map(s => s.id));
    const sources: PublishedSiteSources = {
      ...src,
      spaces,
      dishCategories: src.dishCategories.filter(c => ids.has(c.spaceId)),
      dishes: src.dishes.filter(d => ids.has(d.spaceId)),
      wineCategories: src.wineCategories.filter(c => ids.has(c.spaceId)),
      wines: src.wines.filter(w => ids.has(w.spaceId))
    };
    const media = await this.media.findByIds(publishedSiteMediaIds(sources));
    return { ...sources, media };
  }
}
