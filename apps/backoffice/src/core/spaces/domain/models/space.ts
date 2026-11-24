import { type I18nValue, DomainError } from '@/core/shared/domain';
import type { PublishState, Address } from '@/core/restaurants/domain';

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

/** Textos del bloque de horarios y del aviso «abierto ahora». */
export interface ScheduleTexts {
  title?: I18nValue;
  text?: I18nValue;
  open?: I18nValue;
  nextOpening?: I18nValue;
  closed?: I18nValue;
}

export interface BookingContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
}

/** Como en el restaurante: lo que entra en borrador, publicado y descarte. Los horarios van aparte (tabla propia). */
export const SPACE_CONTENT_KEYS = [
  'name', 'hero', 'manifesto', 'descriptor', 'coverGradient',
  'gallery', 'scheduleTexts', 'address', 'mapUrl', 'bookingContact'
] as const;
export type SpaceContentKey = (typeof SPACE_CONTENT_KEYS)[number];
export type SpaceContent = Pick<Space, SpaceContentKey>;

export type SpaceSnapshot = Partial<SpaceContent> & { schedule?: ScheduleDay[] };

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
  /** Ids de imagen, en el orden en que se enseñan. */
  gallery: string[];
  scheduleTexts: ScheduleTexts;
  /** Dirección, mapa y contacto propios; vacíos = los del restaurante. */
  address: Address;
  mapUrl: string | null;
  bookingContact: BookingContact;
  schedule: ScheduleDay[];
  publishedSnapshot: SpaceSnapshot | null;
}

/** Textos traducibles del espacio, con el nombre que ve el editor. */
export function spaceTranslatableTexts(c: Partial<SpaceContent>): Record<string, I18nValue | undefined> {
  return {
    'Título de la portada': c.hero?.title,
    'Subtítulo de la portada': c.hero?.subtitle,
    'Texto breve de la portada': c.hero?.note,
    'Dato a la izquierda': c.hero?.metaLeft,
    'Dato a la derecha': c.hero?.metaRight,
    'Texto del botón': c.hero?.cta,
    // Sin foto, su descripción no se enseña.
    ...(c.hero?.imageAssetId ? { 'Descripción de la foto': c.hero.imageAlt } : {}),
    'Antetítulo de la presentación': c.manifesto?.eyebrow,
    'Texto de presentación': c.manifesto?.text,
    'Horarios: título': c.scheduleTexts?.title,
    'Horarios: texto': c.scheduleTexts?.text,
    'Horarios: aviso de abierto': c.scheduleTexts?.open,
    'Horarios: aviso de próxima apertura': c.scheduleTexts?.nextOpening,
    'Horarios: aviso de cerrado': c.scheduleTexts?.closed
  };
}

export function spaceMediaIds(c: Partial<SpaceContent> | null | undefined): string[] {
  if (!c) return [];
  return [c.hero?.imageAssetId, ...(c.gallery ?? [])].filter((id): id is string => !!id);
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
