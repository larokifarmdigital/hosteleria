import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import { MediaNotFoundError } from '../../domain/models/media.js';

export class GetMediaReferencesUseCase {
  constructor(private readonly media: MediaRepository) {}

  async execute(id: string): Promise<{ kind: 'hero' | 'gallery' | 'dish'; refId: string }[]> {
    const m = await this.media.findById(id);
    if (!m) throw new MediaNotFoundError(id);
    return this.media.findReferences(id);
  }
}
