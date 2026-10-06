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
  readonly dishesCount: number;
  readonly spacesCount: number;
  constructor(dishesCount: number, spacesCount: number) {
    super(`media_in_use:dishes=${dishesCount},spaces=${spacesCount}`);
    this.name = 'MediaHasReferencesError';
    this.dishesCount = dishesCount;
    this.spacesCount = spacesCount;
  }
}
/** El PUT firmado nunca completó: R2 no tiene el objeto. */
export class MediaUploadMissingError extends Error {
  constructor() { super('upload_not_found_in_r2'); this.name = 'MediaUploadMissingError'; }
}
/** El tamaño real en R2 difiere demasiado del declarado (truncado o manipulado). */
export class MediaUploadSizeMismatchError extends Error {
  constructor() { super('upload_size_mismatch'); this.name = 'MediaUploadSizeMismatchError'; }
}
