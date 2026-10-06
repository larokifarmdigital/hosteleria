import type { I18nValue } from './i18n.js';
import type { PublishState } from './restaurant.js';
import { DomainError } from './errors.js';

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

export class SpaceNotFoundError extends DomainError {
  readonly code = 'SPACE_NOT_FOUND';
  readonly status = 404;
  constructor(_id: string) {
    super('El espacio no existe.');
    this.name = 'SpaceNotFoundError';
  }
}
export class SpaceSlugTakenError extends DomainError {
  readonly code = 'SPACE_SLUG_TAKEN';
  readonly status = 409;
  constructor(slug: string) {
    super(`Ya existe un espacio con el slug «${slug}» en este restaurante.`);
    this.name = 'SpaceSlugTakenError';
  }
}
export class CannotDeleteLastSpaceError extends DomainError {
  readonly code = 'CANNOT_DELETE_LAST_SPACE';
  readonly status = 400;
  constructor() {
    super('Un restaurante no puede quedarse sin ningún espacio.');
    this.name = 'CannotDeleteLastSpaceError';
  }
}
