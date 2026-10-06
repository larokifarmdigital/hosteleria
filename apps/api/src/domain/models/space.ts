import type { I18nValue } from './i18n.js';
import type { PublishState } from './restaurant.js';

/**
 * Entidad `Space` — sala/espacio de un restaurant.
 *
 * Un restaurant tiene 1..N spaces (ej. "Comedor principal", "Terraza",
 * "Barra de coctelería"). Cada space tiene su propio hero, manifiesto,
 * horarios y cartas (dishes + wines).
 */

export type SpaceType =
  | 'restaurant' | 'cafe' | 'coctel' | 'club' | 'terraza' | 'live_music' | 'otro';

export type WeekDay = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';

export interface ScheduleShift {
  open: string;   // "HH:mm"
  close: string;  // "HH:mm"
}

export interface ScheduleDay {
  day: WeekDay;
  shifts: ScheduleShift[];
}

export interface Hero {
  title?: I18nValue;
  subtitle?: I18nValue;
  metaLeft?: I18nValue;
  metaRight?: I18nValue;
  note?: I18nValue;
  cta?: I18nValue;
  imageAlt?: I18nValue;
  imageAssetId?: string;
}

export interface Manifesto {
  eyebrow?: I18nValue;
  text?: I18nValue;
}

export type SpaceSnapshot = Partial<Pick<Space, 'hero' | 'manifesto' | 'descriptor' | 'coverGradient'>>;

export interface Space {
  readonly id: string;
  readonly restaurantId: string;
  slug: string;
  name: string;
  type: SpaceType;
  isDefault: boolean;
  order: number;
  state: PublishState;
  coverGradient: string;
  descriptor: string;
  hero: Hero;
  manifesto: Manifesto;
  schedule: ScheduleDay[];
  publishedSnapshot: SpaceSnapshot | null;
}

// ─── Domain errors ───────────────────────────────────────────────
export class SpaceNotFoundError extends Error {
  constructor(id: string) { super(`space_not_found:${id}`); this.name = 'SpaceNotFoundError'; }
}
export class SpaceSlugTakenError extends Error {
  constructor(slug: string) { super(`space_slug_taken:${slug}`); this.name = 'SpaceSlugTakenError'; }
}
export class CannotDeleteLastSpaceError extends Error {
  constructor() { super('cannot_delete_last_space'); this.name = 'CannotDeleteLastSpaceError'; }
}
