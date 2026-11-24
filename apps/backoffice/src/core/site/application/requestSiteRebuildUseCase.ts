import type { RestaurantRepository, Restaurant } from '@/core/restaurants';
import type { SpaceRepository } from '@/core/spaces';
import type { RebuildHookCaller } from '../domain/services/rebuildHookCaller';

/**
 * Pide regenerar la landing de un restaurante cuando cambia algo que la web
 * enseña. Solo si el restaurante está publicado y tiene hook configurado.
 */
/** Un aviso a la web ya apuntado y pendiente de enviar. */
export interface PendingRebuild {
  restaurantId: string;
  slug: string;
  hookUrl: string;
  requestedAt: Date;
}

export class RequestSiteRebuildUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly hook: RebuildHookCaller
  ) {}

  /**
   * Va en dos pasos porque el proveedor puede tardar varios segundos en contestar
   * y el editor no debe esperarlo: `prepare*` apunta la petición (rápido, antes de
   * responder) y `deliver` la envía (después de responder).
   */
  async prepareForRestaurant(slug: string): Promise<PendingRebuild | null> {
    return this.prepare(await this.restaurants.findBySlug(slug));
  }

  /** Para la carta y la publicación de un espacio: un espacio sin publicar no sale en la web. */
  async prepareForSpace(spaceId: string): Promise<PendingRebuild | null> {
    const space = await this.spaces.findById(spaceId);
    if (!space?.publishedSnapshot) return null;
    return this.prepare(await this.restaurants.findById(space.restaurantId));
  }

  /** Envía el aviso. Si el proveedor no lo acepta, lo deja apuntado como fallo. */
  async deliver(pending: PendingRebuild): Promise<void> {
    const ok = await this.hook.call(pending.hookUrl, { restaurantSlug: pending.slug });
    if (!ok) await this.restaurants.recordRebuild(pending.restaurantId, pending.requestedAt, false);
  }

  private async prepare(r: Restaurant | null): Promise<PendingRebuild | null> {
    if (!r?.rebuildHookUrl || !r.publishedSnapshot) return null;
    const requestedAt = new Date();
    // Se da por aceptado hasta que `deliver` diga lo contrario.
    await this.restaurants.recordRebuild(r.id, requestedAt, true);
    return { restaurantId: r.id, slug: r.slug, hookUrl: r.rebuildHookUrl, requestedAt };
  }
}
