import type { I18nValue } from './i18n.js';

/**
 * Entidad de dominio `Restaurant` — ficha del local.
 *
 * Un restaurant tiene 1..N `Space` asociados; cada space tiene sus platos
 * y vinos. Los campos aquí son los compartidos por todos los espacios
 * (nombre, dominio, dirección, SEO, i18n, estado de publicación).
 */

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

/** Snapshot de los campos editables al momento de publicar — permite discard. */
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
  /** Counts derivados (los calcula la BD/repo, no se persisten). */
  spacesCount: number;
  dishesCount: number;
  winesCount: number;
}

// ─── Domain errors ───────────────────────────────────────────────
export class SlugTakenError extends Error {
  constructor(slug: string) { super(`slug_taken:${slug}`); this.name = 'SlugTakenError'; }
}
export class RestaurantNotFoundError extends Error {
  constructor(slug: string) { super(`restaurant_not_found:${slug}`); this.name = 'RestaurantNotFoundError'; }
}
export class NoSnapshotError extends Error {
  constructor() { super('no_snapshot'); this.name = 'NoSnapshotError'; }
}
export class UnknownLocaleError extends Error {
  constructor(code: string) { super(`unknown_locale:${code}`); this.name = 'UnknownLocaleError'; }
}
