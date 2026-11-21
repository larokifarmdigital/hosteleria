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
  /** Imagen al compartir el enlace. */
  imageAssetId?: string;
}

export interface Branding {
  logoAssetId?: string;
  faviconAssetId?: string;
  appIconAssetId?: string;
}

/** Tarjeta destacada de la portada de un grupo con varios espacios. */
export interface HomeBlock {
  id: string;
  title?: I18nValue;
  text?: I18nValue;
  imageAssetId?: string;
  ctaText?: I18nValue;
  ctaHref?: string;
}

export interface About {
  eyebrow?: I18nValue;
  title?: I18nValue;
  /** Texto plano; los párrafos se separan con una línea en blanco. */
  body?: I18nValue;
  imageAssetIds?: string[];
}

export const GROUP_FEATURE_ICONS = ['users', 'chef', 'wine', 'clock', 'pin', 'star'] as const;
export type GroupFeatureIcon = (typeof GROUP_FEATURE_ICONS)[number];

export interface Groups {
  eyebrow?: I18nValue;
  title?: I18nValue;
  cta?: I18nValue;
  imageAssetId?: string;
  highlights?: { id: string; text?: I18nValue }[];
  features?: { id: string; icon: GroupFeatureIcon; label?: I18nValue; text?: I18nValue }[];
}

export const UI_TEXT_KEYS = {
  nav: ['place', 'kitchen', 'wines', 'gallery', 'book'],
  sections: [
    'dishesEyebrow', 'dishesTitle', 'winesEyebrow', 'winesTitle', 'winesFootnote',
    'galleryEyebrow', 'galleryTitle', 'drinksEyebrow', 'drinksTitle'
  ],
  form: [
    'title', 'intro', 'labelName', 'labelPhone', 'labelEmail', 'labelGuests',
    'labelDate', 'labelTime', 'labelNotes', 'submit', 'success'
  ],
  footer: ['contactColumn', 'byline']
} as const;
export type UiTextGroup = keyof typeof UI_TEXT_KEYS;

/** Textos fijos de la landing (menú, títulos de sección, formulario, pie). */
export type UiTexts = { [G in UiTextGroup]?: Partial<Record<(typeof UI_TEXT_KEYS)[G][number], I18nValue>> };

export interface Faq {
  eyebrow?: I18nValue;
  title?: I18nValue;
  titleAccent?: I18nValue;
  items?: { id: string; question?: I18nValue; answer?: I18nValue }[];
}

export const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'contactless', 'apple_pay', 'google_pay', 'bizum'] as const;
export const EXTRA_SERVICES = [
  'terraza', 'grupos', 'sala_privada', 'vegetariano', 'vegano', 'sin_gluten', 'menu_dia',
  'menu_degustacion', 'carta_vinos', 'bar', 'familiar', 'pet_friendly', 'accesible', 'aparcamiento'
] as const;

/** Datos del negocio para buscadores (JSON-LD). */
export interface Business {
  averagePrice?: number;
  paymentMethods?: (typeof PAYMENT_METHODS)[number][];
  extraServices?: (typeof EXTRA_SERVICES)[number][];
}

/**
 * Campos de contenido: lo que entra en el borrador, en lo publicado y en
 * «volver a lo publicado». Un campo nuevo se añade aquí y viaja solo por
 * guardar, publicar y descartar.
 */
export const RESTAURANT_CONTENT_KEYS = [
  'name', 'domain', 'logoInitial', 'coverGradient', 'timezone',
  'address', 'contact', 'socials', 'seo', 'acceptsBookings', 'showSocials',
  'foundedYear', 'branding', 'homeBlocks', 'about', 'groups', 'mapUrl',
  'showReviews', 'uiTexts', 'faq', 'aiSummary', 'analyticsToken', 'business'
] as const;
export type RestaurantContentKey = (typeof RESTAURANT_CONTENT_KEYS)[number];
export type RestaurantContent = Pick<Restaurant, RestaurantContentKey>;

/** Los snapshots antiguos no traen los campos añadidos después ni los idiomas. */
export type RestaurantSnapshot = Partial<RestaurantContent> & {
  activeLocaleCodes?: string[];
  defaultLocaleCode?: string;
};

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
  foundedYear: number | null;
  branding: Branding;
  homeBlocks: HomeBlock[];
  about: About;
  groups: Groups;
  /** Enlace o código de inserción de Google Maps. */
  mapUrl: string | null;
  showReviews: boolean;
  uiTexts: UiTexts;
  faq: Faq;
  /** Resumen para asistentes de IA (`llms.txt`). */
  aiSummary: I18nValue;
  analyticsToken: string | null;
  business: Business;
  lastPublishedAt: Date | null;
  publishedSnapshot: RestaurantSnapshot | null;
  // Derivados: los calcula el repo con subqueries, no se persisten.
  spacesCount: number;
  dishesCount: number;
  winesCount: number;
}

/** Textos traducibles del restaurante, con el nombre que ve el editor. */
export function restaurantTranslatableTexts(c: Partial<RestaurantContent>): Record<string, I18nValue | undefined> {
  const texts: Record<string, I18nValue | undefined> = {
    'Título en Google': c.seo?.title,
    'Descripción en Google': c.seo?.description,
    'Sobre nosotros: antetítulo': c.about?.eyebrow,
    'Sobre nosotros: título': c.about?.title,
    'Sobre nosotros: texto': c.about?.body,
    'Grupos: antetítulo': c.groups?.eyebrow,
    'Grupos: título': c.groups?.title,
    'Grupos: texto del botón': c.groups?.cta,
    'Preguntas frecuentes: antetítulo': c.faq?.eyebrow,
    'Preguntas frecuentes: título': c.faq?.title,
    'Preguntas frecuentes: título destacado': c.faq?.titleAccent,
    'Resumen para asistentes de IA': c.aiSummary
  };
  c.groups?.highlights?.forEach((h, i) => { texts[`Grupos: punto destacado ${i + 1}`] = h.text; });
  c.groups?.features?.forEach((f, i) => {
    texts[`Grupos: ventaja ${i + 1}, título`] = f.label;
    texts[`Grupos: ventaja ${i + 1}, texto`] = f.text;
  });
  c.homeBlocks?.forEach((b, i) => {
    texts[`Bloque destacado ${i + 1}: título`] = b.title;
    texts[`Bloque destacado ${i + 1}: texto`] = b.text;
    texts[`Bloque destacado ${i + 1}: texto del botón`] = b.ctaText;
  });
  c.faq?.items?.forEach((q, i) => {
    texts[`Pregunta ${i + 1}`] = q.question;
    texts[`Respuesta ${i + 1}`] = q.answer;
  });
  for (const group of Object.keys(UI_TEXT_KEYS) as UiTextGroup[]) {
    const values = (c.uiTexts?.[group] ?? {}) as Record<string, I18nValue | undefined>;
    for (const key of UI_TEXT_KEYS[group]) texts[`Textos de la web: ${group}.${key}`] = values[key];
  }
  return texts;
}

export type RestaurantMediaUse = 'logo' | 'favicon' | 'appIcon' | 'seo' | 'about' | 'groups' | 'homeBlock';

/** Imágenes que usa la ficha, con el sitio donde se usan. */
export function restaurantMediaUses(c: Partial<RestaurantContent> | null | undefined): { use: RestaurantMediaUse; assetId: string }[] {
  if (!c) return [];
  const uses: { use: RestaurantMediaUse; assetId: string | undefined }[] = [
    { use: 'logo', assetId: c.branding?.logoAssetId },
    { use: 'favicon', assetId: c.branding?.faviconAssetId },
    { use: 'appIcon', assetId: c.branding?.appIconAssetId },
    { use: 'seo', assetId: c.seo?.imageAssetId },
    { use: 'groups', assetId: c.groups?.imageAssetId },
    ...(c.about?.imageAssetIds ?? []).map(assetId => ({ use: 'about' as const, assetId })),
    ...(c.homeBlocks ?? []).map(b => ({ use: 'homeBlock' as const, assetId: b.imageAssetId }))
  ];
  return uses.filter((u): u is { use: RestaurantMediaUse; assetId: string } => !!u.assetId);
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
