import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import { SpaceNotFoundError, type Space } from '../../domain/models/space.js';
import { NoSnapshotError } from '../../domain/models/restaurant.js';

export class DiscardSpaceChangesUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, spaceId: string, actorId: string): Promise<Space> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);
    if (!s.publishedSnapshot) throw new NoSnapshotError();

    const snap = s.publishedSnapshot;
    await this.spaces.update(spaceId, {
      hero: snap.hero ?? s.hero,
      manifesto: snap.manifesto ?? s.manifesto,
      descriptor: snap.descriptor ?? s.descriptor,
      coverGradient: snap.coverGradient ?? s.coverGradient,
      state: 'published'
    }, actorId);

    return (await this.spaces.findById(spaceId))!;
  }
}
