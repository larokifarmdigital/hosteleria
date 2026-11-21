import type { MediaAsset, MediaReference, MediaUsage } from '../models/media.js';
import type { I18nValue } from '../models/i18n.js';

/**
 * Metadata del asset. El binario vive en R2 y se maneja aparte vía
 * `MediaStorage` (en `domain/services/`) — no confundir.
 */
export interface MediaRepository {
  findById(id: string): Promise<MediaAsset | null>;
  findByIds(ids: string[]): Promise<MediaAsset[]>;
  /** Solo subidas confirmadas. */
  list(filters?: {
    restaurantSlug?: string;
    usage?: MediaUsage;
    missingAlt?: boolean;
  }): Promise<MediaAsset[]>;

  /** INSERT previo al PUT a R2 — reserva el `mediaId` que el browser usa. */
  createPending(input: {
    restaurantId: string;
    name: string;
    sizeKb: number;
    mimeType: string;
    r2Key: string;
    uploadedBy: string | null;
  }): Promise<MediaAsset>;

  confirmUpload(id: string, patch: {
    width?: number;
    height?: number;
    altText?: I18nValue;
  }): Promise<MediaAsset>;

  update(id: string, patch: Partial<Pick<MediaAsset,
    'usage' | 'hasAltText' | 'altText'
  >>): Promise<void>;

  deleteById(id: string): Promise<void>;

  /** Subidas que se pidieron antes de `before` y nunca se confirmaron. */
  listUnconfirmedBefore(before: Date): Promise<MediaAsset[]>;

  /** Pre-check para delete: no borramos un asset referenciado desde ningún lado. */
  /** Cuenta también lo publicado: una foto que sigue en la web no se borra. */
  findReferences(id: string): Promise<MediaReference[]>;
}
