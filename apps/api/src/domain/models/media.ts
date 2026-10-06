import type { I18nValue } from './i18n.js';
import { DomainError } from './errors.js';

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

export class MediaNotFoundError extends DomainError {
  readonly code = 'MEDIA_NOT_FOUND';
  readonly status = 404;
  constructor(_id: string) {
    super('El archivo no existe.');
    this.name = 'MediaNotFoundError';
  }
}
export class MediaHasReferencesError extends DomainError {
  readonly code = 'MEDIA_IN_USE';
  readonly status = 400;
  readonly dishesCount: number;
  readonly spacesCount: number;
  constructor(dishesCount: number, spacesCount: number) {
    const parts: string[] = [];
    if (dishesCount > 0) parts.push(`${dishesCount} plato${dishesCount === 1 ? '' : 's'}`);
    if (spacesCount > 0) parts.push(`${spacesCount} espacio${spacesCount === 1 ? '' : 's'}`);
    super(`No puedes borrar este archivo: lo usan ${parts.join(' y ')}.`);
    this.name = 'MediaHasReferencesError';
    this.dishesCount = dishesCount;
    this.spacesCount = spacesCount;
  }
}
/** El PUT firmado nunca completó: R2 no tiene el objeto. */
export class MediaUploadMissingError extends DomainError {
  readonly code = 'UPLOAD_NOT_FOUND_IN_R2';
  readonly status = 400;
  constructor() {
    super('No se recibió el archivo en el bucket. Vuelve a intentarlo.');
    this.name = 'MediaUploadMissingError';
  }
}
/** El tamaño real en R2 difiere demasiado del declarado (truncado o manipulado). */
export class MediaUploadSizeMismatchError extends DomainError {
  readonly code = 'UPLOAD_SIZE_MISMATCH';
  readonly status = 400;
  constructor() {
    super('El archivo subido no coincide con el tamaño declarado. Vuelve a intentarlo.');
    this.name = 'MediaUploadSizeMismatchError';
  }
}
