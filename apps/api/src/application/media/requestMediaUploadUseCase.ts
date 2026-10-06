import { createId } from '@paralleldrive/cuid2';
import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import type { MediaStorage } from '../../domain/services/mediaStorage.js';

export interface RequestMediaUploadInput {
  restaurantId: string;
  restaurantSlug: string;
  filename: string;
  mimeType: string;
  sizeKb: number;
  uploadedBy: string | null;
}

export interface RequestMediaUploadResult {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
  r2Key: string;
  expiresIn: number;
}

export class RequestMediaUploadUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage
  ) {}

  async execute(input: RequestMediaUploadInput): Promise<RequestMediaUploadResult> {
    // Convención del bucket: `<restaurantSlug>/<YYYY>/<name>-<shortId>.<ext>`.
    const { name, extension } = this.storage.normalizeFilename(input.filename);
    const year = new Date().getFullYear();
    const shortId = createId().slice(0, 8);
    const r2Key = `${input.restaurantSlug}/${year}/${name}-${shortId}.${extension}`;

    const asset = await this.media.createPending({
      restaurantId: input.restaurantId,
      name: `${name}.${extension}`,
      sizeKb: input.sizeKb,
      mimeType: input.mimeType,
      r2Key,
      uploadedBy: input.uploadedBy
    });

    const { uploadUrl, publicUrl, expiresIn } = await this.storage.createUploadUrl({
      key: r2Key,
      contentType: input.mimeType,
      expiresIn: 300
    });

    return { mediaId: asset.id, uploadUrl, publicUrl, r2Key, expiresIn };
  }
}
