import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import type { MediaStorage } from '../../domain/services/mediaStorage.js';
import {
  MediaNotFoundError,
  MediaUploadNotConfirmedError,
  type MediaAsset
} from '../../domain/models/media.js';
import type { I18nValue } from '../../domain/models/i18n.js';

/**
 * Verifica que el browser realmente completó la subida (HEAD contra R2) y
 * marca el asset como listo. Si R2 no tiene el objeto o el tamaño difiere
 * mucho del declarado, se hace rollback (borra fila + objeto R2).
 */
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
      throw new MediaUploadNotConfirmedError();
    }

    // Tolerancia ±50% por overhead HTTP. Diferencias mayores sugieren truncado.
    const expectedBytes = asset.sizeKb * 1024;
    const diff = Math.abs(head.sizeBytes - expectedBytes) / Math.max(expectedBytes, 1);
    if (diff > 0.5) {
      await this.media.deleteById(mediaId);
      await this.storage.delete(asset.r2Key).catch(() => void 0);
      throw new MediaUploadNotConfirmedError();
    }

    return this.media.confirmUpload(mediaId, {
      width: input.width,
      height: input.height,
      altText: input.altText
    });
  }
}
