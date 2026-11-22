import type { I18nValue } from './i18n.js';
import type { Dish, DishCategory, DishKind } from './dish.js';
import type { Wine, WineCategory } from './wine.js';
import type { LegalPage, LegalPageType } from './legalPage.js';
import type { MediaAsset } from './media.js';
import {
  RESTAURANT_CONTENT_KEYS,
  restaurantMediaUses,
  type Restaurant,
  type RestaurantContent
} from './restaurant.js';
import {
  SPACE_CONTENT_KEYS,
  spaceMediaIds,
  type ScheduleDay,
  type Space,
  type SpaceContent,
  type SpaceType,
  type WeekDay
} from './space.js';

/**
 * Lo que una landing necesita para construirse: solo lo publicado. El borrador
 * no sale nunca de aquí; la carta y las páginas legales no tienen borrador y
 * salen tal como están guardadas.
 */

export interface PublishedMedia {
  url: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  alt: I18nValue;
}

export interface PublishedDish {
  id: string;
  name: I18nValue;
  note: I18nValue;
  price: number | null;
  imageAssetId: string | null;
}

export interface PublishedWine {
  id: string;
  name: string;
  region: string | null;
  note: I18nValue;
  priceGlass: number | null;
  priceBottle: number | null;
}

export interface PublishedSpace extends SpaceContent {
  id: string;
  slug: string;
  type: SpaceType;
  isDefault: boolean;
  /** Los siete días, de lunes a domingo; sin turnos = cerrado. */
  schedule: ScheduleDay[];
  dishCategories: { id: string; name: I18nValue; dishes: PublishedDish[] }[];
  /** Carta de bebidas: misma forma que la de platos. */
  drinkCategories: { id: string; name: I18nValue; drinks: PublishedDish[] }[];
  wineCategories: { id: string; name: I18nValue; wines: PublishedWine[] }[];
}

export interface PublishedSite {
  restaurant: RestaurantContent & {
    slug: string;
    defaultLocale: string;
    /** El principal primero; el resto, por código. */
    activeLocales: string[];
    /** Los mismos idiomas, con el nombre que se enseña en el selector. */
    locales: { code: string; name: string }[];
    publishedAt: string | null;
  };
  /** Solo los espacios publicados, en su orden. */
  spaces: PublishedSpace[];
  legalPages: { type: LegalPageType; title: I18nValue; content: I18nValue; lastUpdated: string | null }[];
  /** Por id de imagen. Un id que no esté aquí es una imagen que ya no existe. */
  media: Record<string, PublishedMedia>;
}

// Campos que se añadieron cuando ya había restaurantes publicados: un snapshot
// anterior no los trae. Van vacíos, nunca con el valor del borrador.
const RESTAURANT_LATER_DEFAULTS: Partial<RestaurantContent> = {
  foundedYear: null, branding: {}, homeBlocks: [], about: {}, groups: {}, mapUrl: null,
  showReviews: false, uiTexts: {}, faq: {}, aiSummary: {}, analyticsToken: null, business: {}
};
const SPACE_LATER_DEFAULTS: Partial<SpaceContent> = {
  gallery: [], scheduleTexts: {}, address: {}, mapUrl: null, bookingContact: {}
};

const WEEK: WeekDay[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function fromSnapshot<T extends object>(
  keys: readonly (keyof T)[],
  snapshot: Partial<T>,
  laterDefaults: Partial<T>,
  current: T
): T {
  const out = {} as T;
  for (const key of keys) {
    if (snapshot[key] !== undefined) out[key] = snapshot[key] as T[keyof T];
    else if (key in laterDefaults) out[key] = laterDefaults[key] as T[keyof T];
    // Campos de identidad que todo snapshot trae; el valor actual es solo una red.
    else out[key] = current[key];
  }
  return out;
}

/** `null` si el restaurante no se ha publicado nunca. */
export function publishedRestaurantContent(r: Restaurant): RestaurantContent | null {
  if (!r.publishedSnapshot) return null;
  return fromSnapshot<RestaurantContent>(RESTAURANT_CONTENT_KEYS, r.publishedSnapshot, RESTAURANT_LATER_DEFAULTS, r);
}

export function publishedSpaceContent(s: Space): SpaceContent | null {
  if (!s.publishedSnapshot) return null;
  return fromSnapshot<SpaceContent>(SPACE_CONTENT_KEYS, s.publishedSnapshot, SPACE_LATER_DEFAULTS, s);
}

export interface PublishedSiteSources {
  restaurant: Restaurant;
  spaces: Space[];
  dishCategories: DishCategory[];
  dishes: Dish[];
  wineCategories: WineCategory[];
  wines: Wine[];
  legalPages: LegalPage[];
  /** Idiomas dados de alta, para dar nombre a los del restaurante. */
  languages?: { code: string; name: string }[];
}

/** Ids de las imágenes que salen en la web publicada. */
export function publishedSiteMediaIds(src: Pick<PublishedSiteSources, 'restaurant' | 'spaces' | 'dishes'>): string[] {
  const ids = new Set<string>();
  for (const use of restaurantMediaUses(publishedRestaurantContent(src.restaurant))) ids.add(use.assetId);
  const publishedSpaceIds = new Set<string>();
  for (const s of src.spaces) {
    const content = publishedSpaceContent(s);
    if (!content) continue;
    publishedSpaceIds.add(s.id);
    for (const id of spaceMediaIds(content)) ids.add(id);
  }
  for (const d of src.dishes) {
    if (d.active && d.imageAssetId && publishedSpaceIds.has(d.spaceId)) ids.add(d.imageAssetId);
  }
  return [...ids];
}

/** `null` si el restaurante no se ha publicado nunca. */
export function buildPublishedSite(
  src: PublishedSiteSources,
  media: MediaAsset[],
  mediaBaseUrl: string
): PublishedSite | null {
  const r = src.restaurant;
  const content = publishedRestaurantContent(r);
  if (!content) return null;

  const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

  const spaces: PublishedSpace[] = [];
  for (const s of [...src.spaces].sort(byOrder)) {
    const spaceContent = publishedSpaceContent(s);
    if (!spaceContent) continue;
    const schedule = s.publishedSnapshot?.schedule ?? s.schedule;

    const menu = (kind: DishKind) => src.dishCategories
      .filter(c => c.spaceId === s.id && c.kind === kind)
      .sort(byOrder)
      .map(c => ({
        id: c.id,
        name: c.name ?? {},
        items: src.dishes
          .filter(d => d.categoryId === c.id && d.active)
          .sort(byOrder)
          .map(d => ({ id: d.id, name: d.name ?? {}, note: d.note ?? {}, price: d.price, imageAssetId: d.imageAssetId }))
      }))
      .filter(c => c.items.length > 0);
    const dishCategories = menu('dish').map(({ items, ...c }) => ({ ...c, dishes: items }));
    const drinkCategories = menu('drink').map(({ items, ...c }) => ({ ...c, drinks: items }));

    const wineCategories = src.wineCategories
      .filter(c => c.spaceId === s.id)
      .sort(byOrder)
      .map(c => ({
        id: c.id,
        name: c.name ?? {},
        wines: src.wines
          .filter(w => w.categoryId === c.id && w.active)
          .sort(byOrder)
          .map(w => ({
            id: w.id, name: w.name, region: w.region, note: w.note ?? {},
            priceGlass: w.priceGlass, priceBottle: w.priceBottle
          }))
      }))
      .filter(c => c.wines.length > 0);

    spaces.push({
      id: s.id,
      slug: s.slug,
      type: s.type,
      isDefault: s.isDefault,
      ...spaceContent,
      schedule: WEEK.map(day => ({ day, shifts: schedule.find(d => d.day === day)?.shifts ?? [] })),
      dishCategories,
      drinkCategories,
      wineCategories
    });
  }

  // Solo imágenes confirmadas y de este restaurante: una referencia a cualquier
  // otra cosa no debe servir para sacar su URL por aquí.
  const base = mediaBaseUrl.replace(/\/$/, '');
  const wanted = new Set(publishedSiteMediaIds(src));
  const mediaMap: Record<string, PublishedMedia> = {};
  for (const m of media) {
    if (!wanted.has(m.id) || !m.confirmedAt || m.restaurantId !== r.id) continue;
    mediaMap[m.id] = { url: `${base}/${m.r2Key}`, width: m.width, height: m.height, mimeType: m.mimeType, alt: m.altText ?? {} };
  }

  // jsonb y la tabla de idiomas no guardan orden: se fija uno para que dos
  // builds del mismo contenido salgan iguales.
  const defaultLocale = r.publishedSnapshot?.defaultLocaleCode ?? r.defaultLocaleCode;
  const activeLocales = [...new Set([defaultLocale, ...[...(r.publishedSnapshot?.activeLocaleCodes ?? r.activeLocaleCodes)].sort()])];

  return {
    restaurant: {
      slug: r.slug,
      ...content,
      defaultLocale,
      activeLocales,
      locales: activeLocales.map(code => ({ code, name: src.languages?.find(l => l.code === code)?.name ?? code })),
      publishedAt: r.lastPublishedAt?.toISOString() ?? null
    },
    spaces,
    legalPages: src.legalPages.map(p => ({ type: p.type, title: p.title, content: p.content, lastUpdated: p.lastUpdated })),
    media: mediaMap
  };
}
