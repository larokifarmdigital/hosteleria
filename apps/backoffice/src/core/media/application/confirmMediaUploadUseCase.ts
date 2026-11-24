import type { MediaRepository } from '../domain/repositories/mediaRepository';
import type { MediaStorage } from '../domain/services/mediaStorage';
import {
  MediaNotFoundError,
  MediaUploadMissingError,
  MediaUploadSizeMismatchError,
  type MediaAsset
} from '../domain/models/media';
import type { I18nValue } from '@/core/shared';

export interface ConfirmMediaUploadInput {
  width?: number;
  height?: number;
  altText?: I18nValue;
}

export class ConfirmMediaUploadUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage
  ) {}

  async execute(mediaId: string, input: ConfirmMediaUploadInput): Promise<MediaAsset> {
    const asset = await this.media.findById(mediaId);
    if (!asset) throw new MediaNotFoundError(mediaId);

    const head = await this.storage.head(asset.r2Key);
    if (!head) {
      // Rollback: la fila se creó al pedir upload-url pero el PUT nunca llegó.
      await this.media.deleteById(mediaId);
      throw new MediaUploadMissingError();
    }

    // La URL firmada ya ata tipo y tamaño; esto lo vuelve a comprobar por si el objeto
    // llegó por otra vía. `sizeKb` se guarda redondeado hacia arriba al pedir la URL.
    const sameSize = Math.ceil(head.sizeBytes / 1024) === asset.sizeKb;
    const sameType = head.contentType === undefined || head.contentType === asset.mimeType;
    if (!sameSize || !sameType) {
      await this.media.deleteById(mediaId);
      await this.storage.delete(asset.r2Key).catch(() => void 0);
      throw new MediaUploadSizeMismatchError();
    }

    return this.media.confirmUpload(mediaId, {
      width: input.width,
      height: input.height,
      altText: input.altText
    });
  }
}
