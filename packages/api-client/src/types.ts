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
  title?: I18nString;
  text?: I18nText;
  imageAssetId?: string;
  ctaText?: I18nString;
  ctaHref?: string;
}
export interface About {
  eyebrow?: I18nString;
  title?: I18nString;
  /** Texto plano; los párrafos se separan con una línea en blanco. */
  body?: I18nText;
  imageAssetIds?: string[];
}
export type GroupFeatureIcon = 'users' | 'chef' | 'wine' | 'clock' | 'pin' | 'star';
export interface Groups {
  eyebrow?: I18nString;
  title?: I18nString;
  cta?: I18nString;
  imageAssetId?: string;
  highlights?: Array<{ id: string; text?: I18nString }>;
  features?: Array<{ id: string; icon: GroupFeatureIcon; label?: I18nString; text?: I18nText }>;
}
/** Textos fijos de la landing (menú, títulos de sección, formulario, pie). */
export interface UiTexts {
  nav?: Partial<Record<'place' | 'kitchen' | 'wines' | 'gallery' | 'book', I18nString>>;
  sections?: Partial<Record<
    'dishesEyebrow' | 'dishesTitle' | 'winesEyebrow' | 'winesTitle' | 'winesFootnote' |
    'galleryEyebrow' | 'galleryTitle' | 'drinksEyebrow' | 'drinksTitle', I18nString>>;
  form?: Partial<Record<
    'title' | 'intro' | 'labelName' | 'labelPhone' | 'labelEmail' | 'labelGuests' |
    'labelDate' | 'labelTime' | 'labelNotes' | 'submit' | 'success', I18nString>>;
  footer?: Partial<Record<'contactColumn' | 'byline', I18nString>>;
}
export interface Faq {
  eyebrow?: I18nString;
  title?: I18nString;
  titleAccent?: I18nString;
  items?: Array<{ id: string; question?: I18nString; answer?: I18nText }>;
}
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'contactless' | 'apple_pay' | 'google_pay' | 'bizum';
export type ExtraService =
  | 'terraza' | 'grupos' | 'sala_privada' | 'vegetariano' | 'vegano' | 'sin_gluten' | 'menu_dia'
  | 'menu_degustacion' | 'carta_vinos' | 'bar' | 'familiar' | 'pet_friendly' | 'accesible' | 'aparcamiento';
/** Datos del negocio para buscadores (JSON-LD). */
export interface Business {
  averagePrice?: number;
  paymentMethods?: PaymentMethod[];
  extraServices?: ExtraService[];
}

/** Campos del restaurante que entran en el borrador y en lo publicado. */
export type RestaurantContentKey =
  | 'name' | 'domain' | 'logoInitial' | 'coverGradient' | 'timezone'
  | 'address' | 'contact' | 'socials' | 'seo' | 'acceptsBookings' | 'showSocials'
  | 'foundedYear' | 'branding' | 'homeBlocks' | 'about' | 'groups' | 'mapUrl'
  | 'showReviews' | 'uiTexts' | 'faq' | 'aiSummary' | 'analyticsToken' | 'business';

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
  aiSummary: I18nText;
  analyticsToken: string | null;
  business: Business;
  lastPublishedAt: string | null;
  /** Lo último publicado; `null` si nunca se publicó. Los antiguos no traen los campos añadidos después. */
  publishedSnapshot: (Partial<Pick<Restaurant, RestaurantContentKey>> & { activeLocaleCodes?: LocaleCode[]; defaultLocaleCode?: LocaleCode }) | null;
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

export interface ScheduleTexts {
  title?: I18nString;
  text?: I18nText;
  open?: I18nString;
  nextOpening?: I18nString;
  closed?: I18nString;
}
export interface BookingContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
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
  /** Ids de imagen, en el orden en que se enseñan. */
  gallery: string[];
  scheduleTexts: ScheduleTexts;
  /** Dirección, mapa y contacto propios; vacíos = los del restaurante. */
  address: Address;
  mapUrl: string | null;
  bookingContact: BookingContact;
  schedule: ScheduleDay[];
  /** Lo último publicado; `null` si nunca se publicó. */
  publishedSnapshot: Partial<Pick<Space, 'name' | 'hero' | 'manifesto' | 'descriptor' | 'coverGradient' | 'schedule' | 'gallery' | 'scheduleTexts' | 'address' | 'mapUrl' | 'bookingContact'>> | null;
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

/** Dónde se usa una imagen: platos con esa foto y espacios con esa portada. */
export type RestaurantMediaUse = 'logo' | 'favicon' | 'appIcon' | 'seo' | 'about' | 'groups' | 'homeBlock';
export interface MediaReferences {
  dishes: Array<{ id: string; name: I18nString }>;
  /** Espacios que la usan de portada. */
  spaces: Array<{ id: string; name: string }>;
  /** Espacios que la tienen en la galería. */
  galleries: Array<{ id: string; name: string }>;
  /** Sitios de la ficha del restaurante donde se usa. */
  restaurant: RestaurantMediaUse[];
}

// ─── Legal pages ─────────────────────────────────────────────────
export type LegalPageType = 'legal-notice' | 'privacy' | 'cookies';
export interface LegalPage {
  id: string;
  type: LegalPageType;
  title: I18nString;
  /** Markdown por idioma. */
  content: I18nText;
  /** "YYYY-MM-DD". */
  lastUpdated: string | null;
  updatedAt: string;
}

// ─── Sitio publicado (lectura pública, sin sesión) ───────────────
export interface PublishedMedia {
  url: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  alt: I18nString;
}
export interface PublishedDish {
  id: string;
  name: I18nString;
  note: I18nText;
  price: number | null;
  imageAssetId: string | null;
}
export interface PublishedWine {
  id: string;
  name: string;
  region: string | null;
  note: I18nText;
  priceGlass: number | null;
  priceBottle: number | null;
}
export interface PublishedSpace extends Pick<Space,
  'id' | 'slug' | 'type' | 'isDefault' | 'name' | 'hero' | 'manifesto' | 'descriptor' | 'coverGradient'
  | 'gallery' | 'scheduleTexts' | 'address' | 'mapUrl' | 'bookingContact'> {
  /** Los siete días, de lunes a domingo; sin turnos = cerrado. */
  schedule: ScheduleDay[];
  /** Solo platos activos; las categorías sin ninguno no salen. */
  dishCategories: { id: string; name: I18nString; dishes: PublishedDish[] }[];
  wineCategories: { id: string; name: I18nString; wines: PublishedWine[] }[];
}
/** Lo que una landing necesita para construirse: solo lo publicado. */
export interface PublishedSite {
  restaurant: Pick<Restaurant, RestaurantContentKey | 'slug' | 'defaultLocale' | 'activeLocales'> & { publishedAt: string | null };
  /** Solo los espacios publicados, en su orden. */
  spaces: PublishedSpace[];
  legalPages: Pick<LegalPage, 'type' | 'title' | 'content' | 'lastUpdated'>[];
  /** Por id de imagen. Un id que no esté aquí es una imagen que ya no existe. */
  media: Record<string, PublishedMedia>;
}

export interface UploadUrlResponse {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
  r2Key: string;
  expiresIn: number;
}
