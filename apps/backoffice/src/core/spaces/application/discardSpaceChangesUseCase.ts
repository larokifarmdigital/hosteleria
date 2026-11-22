import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import { SPACE_CONTENT_KEYS, SpaceNotFoundError, type Space } from '../../domain/models/space.js';
import { NoSnapshotError } from '../../domain/models/restaurant.js';

export class DiscardSpaceChangesUseCase {
  constructor(private readonly spaces: SpaceRepository) {}

  async execute(restaurantId: string, spaceId: string, actorId: string): Promise<Space> {
    const s = await this.spaces.findById(spaceId);
    if (!s || s.restaurantId !== restaurantId) throw new SpaceNotFoundError(spaceId);
    if (!s.publishedSnapshot) throw new NoSnapshotError();

    const snap = s.publishedSnapshot;
    // Lo que el snapshot no trae (campos añadidos después de publicar) se deja como está.
    const patch: Partial<Space> = { state: 'published' };
    for (const key of SPACE_CONTENT_KEYS) {
      if (key in snap && snap[key] !== undefined) (patch as Record<string, unknown>)[key] = snap[key];
    }
    await this.spaces.update(spaceId, patch, actorId);
    // Los snapshots anteriores a que se guardaran los horarios no los traen:
    // en ese caso se dejan como están.
    if (snap.schedule) await this.spaces.replaceSchedule(spaceId, snap.schedule);

    return (await this.spaces.findById(spaceId))!;
  }
}
