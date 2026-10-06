import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import { RestaurantNotFoundError, NoSnapshotError } from '../../domain/models/restaurant.js';

/**
 * Revierte los campos editables del restaurant al último `publishedSnapshot`.
 * Lanza `NoSnapshotError` si el restaurant nunca se publicó.
 */
export class DiscardChangesUseCase {
  constructor(private readonly restaurants: RestaurantRepository) {}

  async execute(slug: string, actorId: string): Promise<{ id: string }> {
    const r = await this.restaurants.findBySlug(slug);
    if (!r) throw new RestaurantNotFoundError(slug);
    if (!r.publishedSnapshot) throw new NoSnapshotError();

    const snap = r.publishedSnapshot;
    await this.restaurants.update(r.id, {
      name: snap.name ?? r.name,
      domain: snap.domain ?? r.domain,
      logoInitial: snap.logoInitial ?? r.logoInitial,
      coverGradient: snap.coverGradient ?? r.coverGradient,
      timezone: snap.timezone ?? r.timezone,
      address: snap.address ?? r.address,
      contact: snap.contact ?? r.contact,
      socials: snap.socials ?? r.socials,
      seo: snap.seo ?? r.seo,
      acceptsBookings: snap.acceptsBookings ?? r.acceptsBookings,
      showSocials: snap.showSocials ?? r.showSocials,
      state: 'published'
    }, actorId);

    return { id: r.id };
  }
}
