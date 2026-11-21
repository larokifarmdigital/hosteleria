import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import type { RebuildHookCaller } from '../../domain/services/rebuildHookCaller.js';
import type { Restaurant } from '../../domain/models/restaurant.js';

/**
 * Pide regenerar la landing de un restaurante cuando cambia algo que la web
 * enseña. Solo si el restaurante está publicado y tiene hook configurado.
 */
export class RequestSiteRebuildUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly hook: RebuildHookCaller
  ) {}

  async forRestaurant(slug: string): Promise<void> {
    await this.fire(await this.restaurants.findBySlug(slug));
  }

  /** Para la carta y la publicación de un espacio: un espacio sin publicar no sale en la web. */
  async forSpace(spaceId: string): Promise<void> {
    const space = await this.spaces.findById(spaceId);
    if (!space?.publishedSnapshot) return;
    await this.fire(await this.restaurants.findById(space.restaurantId));
  }

  private async fire(r: Restaurant | null): Promise<void> {
    if (!r?.rebuildHookUrl || !r.publishedSnapshot) return;
    await this.hook.call(r.rebuildHookUrl, { restaurantSlug: r.slug });
  }
}
