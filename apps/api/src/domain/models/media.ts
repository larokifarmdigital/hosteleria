import type { I18nValue } from './i18n.js';

export type MediaUsage = 'hero' | 'gallery' | 'dish' | 'unused';

export interface MediaAsset {
  readonly id: string;
  /** Null tras borrar el restaurant (FK ON DELETE SET NULL — el asset sobrevive huérfano). */
  readonly restaurantId: string | null;
  name: string;
  sizeKb: number;
  width: number | null;
  height: number | null;
  mimeType: string;
  /** Path completo en el bucket, p.ej. `casabella/2026/hero-01.webp`. */
  r2Key: string;
  usage: MediaUsage;
  hasAltText: boolean;
  altText: I18nValue;
  readonly createdAt: Date;
  readonly uploadedBy: string | null;
}

export class MediaNotFoundError extends Error {
  constructor(id: string) { super(`media_not_found:${id}`); this.name = 'MediaNotFoundError'; }
}
export class MediaHasReferencesError extends Error {
  constructor() { super('media_has_references'); this.name = 'MediaHasReferencesError'; }
}
export class MediaUploadNotConfirmedError extends Error {
  constructor() { super('media_upload_not_confirmed'); this.name = 'MediaUploadNotConfirmedError'; }
}
