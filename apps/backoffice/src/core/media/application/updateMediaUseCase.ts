import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import { MediaNotFoundError, type MediaAsset, type MediaUsage } from '../../domain/models/media.js';
import type { I18nValue } from '../../domain/models/i18n.js';

export interface UpdateMediaInput {
  usage?: MediaUsage;
  hasAltText?: boolean;
  altText?: I18nValue;
}

export class UpdateMediaUseCase {
  constructor(private readonly media: MediaRepository) {}

  async execute(id: string, patch: UpdateMediaInput): Promise<MediaAsset> {
    const m = await this.media.findById(id);
    if (!m) throw new MediaNotFoundError(id);
    await this.media.update(id, patch);
    return (await this.media.findById(id))!;
  }
}
