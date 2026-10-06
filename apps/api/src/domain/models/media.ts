import type { I18nValue } from './i18n.js';

/**
 * Entidad `MediaAsset` — imagen alojada en R2.
 *
 * El binario vive en R2 bajo `r2Key`; la entidad guarda metadata (tamaño,
 * dimensiones), uso actual (`hero`, `gallery`, `dish`, `unused`) y alt text
 * i18n para accesibilidad y SEO.
 */

export type MediaUsage = 'hero' | 'gallery' | 'dish' | 'unused';

export interface MediaAsset {
  readonly id: string;
  /** Puede ser null si el restaurant fue borrado (FK ON DELETE SET NULL). */
  readonly restaurantId: string | null;
  name: string;              // filename original normalizado
  sizeKb: number;
  width: number | null;
  height: number | null;
  mimeType: string;
  r2Key: string;             // key completa en R2 (ej. casabella/2026/hero-01.webp)
  usage: MediaUsage;
  hasAltText: boolean;
  altText: I18nValue;
  readonly createdAt: Date;
  readonly uploadedBy: string | null;
}

// ─── Domain errors ───────────────────────────────────────────────
export class MediaNotFoundError extends Error {
  constructor(id: string) { super(`media_not_found:${id}`); this.name = 'MediaNotFoundError'; }
}
export class MediaHasReferencesError extends Error {
  constructor() { super('media_has_references'); this.name = 'MediaHasReferencesError'; }
}
export class MediaUploadNotConfirmedError extends Error {
  constructor() { super('media_upload_not_confirmed'); this.name = 'MediaUploadNotConfirmedError'; }
}
