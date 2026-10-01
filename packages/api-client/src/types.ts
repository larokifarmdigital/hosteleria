/**
 * Types del contrato API. Espejo de los shapes que devuelven las rutas
 * de `apps/api` — mantener sincronizado cuando cambien los DTOs.
 *
 * Este paquete es la fuente única de tipos para el backoffice; se
 * elimina la duplicación con `apps/backoffice/src/lib/types.ts` (ese
 * archivo re-exporta desde aquí).
 */

// ─── i18n ────────────────────────────────────────────────────────
export type LocaleCode = 'es' | 'ca' | 'en' | (string & {});
export type I18nString = Partial<Record<LocaleCode, string>>;
export type I18nText = Partial<Record<LocaleCode, string>>;

// ─── Language ────────────────────────────────────────────────────
export interface Language {
  id: string;
  code: LocaleCode;
  name: string;
  usedByCount: number;
}

// ─── Auth ────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'editor';

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: UserRole;
  restaurants: string[];         // slugs; '*' si admin
  lastAccessAt: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarColor: string;
}

// ─── Restaurants ─────────────────────────────────────────────────
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
  title?: I18nString;
  description?: I18nText;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  domain: string;
  logoInitial: string;
  coverGradient: string;
  state: PublishState;
  activeLocales: LocaleCode[];
  defaultLocale: LocaleCode;
  acceptsBookings: boolean;
  showSocials: boolean;
  /** IANA timezone (ej. 'Europe/Madrid'). */
  timezone: string;
  /** URL del Vercel Deploy Hook de la landing — null si no está configurado. */
  rebuildHookUrl: string | null;
  address: Address;
  contact: Contact;
  socials: Socials;
  seo: Seo;
  lastPublishedAt: string | null;
  completePercent: number;
  spacesCount: number;
  dishesCount: number;
  winesCount: number;
}

// ─── Spaces ──────────────────────────────────────────────────────
export type SpaceType = 'restaurant' | 'cafe' | 'coctel' | 'club' | 'terraza' | 'live_music' | 'otro';

export interface ScheduleShift { open: string; close: string; }
export interface ScheduleDay {
  day: 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';
  shifts: ScheduleShift[];
}

export interface Hero {
  title?: I18nString;
  subtitle?: I18nString;
  metaLeft?: I18nString;
  metaRight?: I18nString;
  note?: I18nText;
  cta?: I18nString;
  imageAlt?: I18nString;
  imageAssetId?: string;
}
export interface Manifesto {
  eyebrow?: I18nString;
  text?: I18nText;
}

export interface Space {
  id: string;
  restaurantId: string;
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
  galleryCount: number;
  dishesCount: number;
  winesCount: number;
  completePercent: number;
  lastEditedAt: string;
}

// ─── Menu ────────────────────────────────────────────────────────
export interface DishCategory {
  id: string;
  spaceId: string;
  name: I18nString;
  order: number;
}
export interface Dish {
  id: string;
  spaceId: string;
  categoryId: string;
  restaurantSlug: string;
  restaurantName: string;
  categoryName: string;
  name: I18nString;
  note: I18nText;
  price: number | null;
  order: number;
  active: boolean;
  localesFilled: LocaleCode[];
  imageAssetId: string | null;
  imageGradient: string;
}
export interface WineCategory {
  id: string;
  spaceId: string;
  name: I18nString;
  order: number;
}
export interface Wine {
  id: string;
  spaceId: string;
  categoryId: string;
  restaurantSlug: string;
  restaurantName: string;
  categoryName: string;
  name: string;
  region: string | null;
  note: I18nText;
  priceGlass: number | null;
  priceBottle: number | null;
  order: number;
  active: boolean;
  localesFilled: LocaleCode[];
  imageGradient: string;
}

// ─── Media ───────────────────────────────────────────────────────
export type MediaUsage = 'hero' | 'gallery' | 'dish' | 'unused';

export interface MediaAsset {
  id: string;
  name: string;
  r2Key: string;
  publicUrl: string;
  mimeType: string;
  sizeKb: number;
  width: number | null;
  height: number | null;
  usage: MediaUsage;
  hasAltText: boolean;
  altText: I18nString;
  restaurantSlug: string | null;
  restaurantName: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface UploadUrlResponse {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
  r2Key: string;
  expiresIn: number;
}
