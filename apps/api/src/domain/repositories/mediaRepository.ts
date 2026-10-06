import type { MediaAsset, MediaUsage } from '../models/media.js';
import type { I18nValue } from '../models/i18n.js';

/**
 * Puerto de persistencia para `MediaAsset`.
 *
 * ⚠️ No confundir con `MediaStorage` (en `domain/services/`): este es la
 * capa de BD (metadata de los assets); `MediaStorage` es el bucket R2
 * donde vive el binario.
 */
export interface MediaRepository {
  findById(id: string): Promise<MediaAsset | null>;
  list(filters?: {
    restaurantSlug?: string;
    usage?: MediaUsage;
    missingAlt?: boolean;
  }): Promise<MediaAsset[]>;

  /**
   * Crea una fila pre-upload (status = pending). Útil para generar `mediaId`
   * antes de que el browser suba. Al confirmar, se completan width/height.
   */
  createPending(input: {
    restaurantId: string;
    name: string;
    sizeKb: number;
    mimeType: string;
    r2Key: string;
    uploadedBy: string | null;
  }): Promise<MediaAsset>;

  /** Al confirmar el upload: completa dimensiones + alt + usage='unused'. */
  confirmUpload(id: string, patch: {
    width?: number;
    height?: number;
    altText?: I18nValue;
  }): Promise<MediaAsset>;

  update(id: string, patch: Partial<Pick<MediaAsset,
    'usage' | 'hasAltText' | 'altText'
  >>): Promise<void>;

  deleteById(id: string): Promise<void>;

  /** Lista referencias (hero/gallery/dish) para pre-check de delete. */
  findReferences(id: string): Promise<{ kind: 'hero' | 'gallery' | 'dish'; refId: string }[]>;
}
