import type { I18nValue } from './i18n.js';
import { DomainError } from './errors.js';

export type PublishState = 'published' | 'draft' | 'warnings' | 'new';

export interface Address {
  street?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  district?: string;
  country?: string;
}

export interface Contact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  web?: string;
}

export interface Socials {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface Seo {
  title?: I18nValue;
  description?: I18nValue;
}

/** Snapshot al publicar — permite revertir cambios en borrador vía `discardChanges`. */
export type RestaurantSnapshot = Partial<Pick<Restaurant,
  'name' | 'domain' | 'logoInitial' | 'coverGradient' | 'timezone' |
  'address' | 'contact' | 'socials' | 'seo' | 'acceptsBookings' | 'showSocials'
>>;

export interface Restaurant {
  readonly id: string;
  readonly slug: string;
  name: string;
  domain: string;
  logoInitial: string;
  coverGradient: string;
  state: PublishState;
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
  acceptsBookings: boolean;
  showSocials: boolean;
  timezone: string;
  rebuildHookUrl: string | null;
  address: Address;
  contact: Contact;
  socials: Socials;
  seo: Seo;
  lastPublishedAt: Date | null;
  publishedSnapshot: RestaurantSnapshot | null;
  // Derivados: los calcula el repo con subqueries, no se persisten.
  spacesCount: number;
  dishesCount: number;
  winesCount: number;
}

export class SlugTakenError extends DomainError {
  readonly code = 'SLUG_TAKEN';
  readonly status = 409;
  constructor(slug: string) {
    super(`El slug «${slug}» ya está en uso. Elige otro.`);
    this.name = 'SlugTakenError';
  }
}
export class RestaurantNotFoundError extends DomainError {
  readonly code = 'RESTAURANT_NOT_FOUND';
  readonly status = 404;
  constructor(slug: string) {
    super(`El restaurante «${slug}» no existe.`);
    this.name = 'RestaurantNotFoundError';
  }
}
export class NoSnapshotError extends DomainError {
  readonly code = 'NO_SNAPSHOT';
  readonly status = 400;
  constructor() {
    super('No hay una versión publicada a la que volver.');
    this.name = 'NoSnapshotError';
  }
}
export class UnknownLocaleError extends DomainError {
  readonly code = 'UNKNOWN_LOCALE';
  readonly status = 400;
  constructor(code: string) {
    super(`El idioma «${code}» no está dado de alta en el sistema.`);
    this.name = 'UnknownLocaleError';
  }
}
