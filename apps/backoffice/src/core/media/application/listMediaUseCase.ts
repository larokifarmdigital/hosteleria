import type { MediaRepository } from '../domain/repositories/mediaRepository';
import type { MediaAsset, MediaUsage } from '../domain/models/media';

export interface ListMediaFilters {
  restaurantSlug?: string;
  usage?: MediaUsage;
  missingAlt?: boolean;
}

export class ListMediaUseCase {
  constructor(private readonly media: MediaRepository) {}

  async execute(filters?: ListMediaFilters): Promise<MediaAsset[]> {
    return this.media.list(filters);
  }
}
