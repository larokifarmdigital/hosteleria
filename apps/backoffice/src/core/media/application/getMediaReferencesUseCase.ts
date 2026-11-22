import type { MediaRepository } from '../domain/repositories/mediaRepository';
import { MediaNotFoundError, type MediaReference } from '../domain/models/media';

export class GetMediaReferencesUseCase {
  constructor(private readonly media: MediaRepository) {}

  async execute(id: string): Promise<MediaReference[]> {
    const m = await this.media.findById(id);
    if (!m) throw new MediaNotFoundError(id);
    return this.media.findReferences(id);
  }
}
