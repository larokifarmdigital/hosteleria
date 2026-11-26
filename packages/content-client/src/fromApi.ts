// El sitio publicado del api, con la forma que las landings ya consumen (la de
// los documentos de Sanity). Así una landing cambia de origen sin tocar sus
// componentes. Cuando ninguna lea de Sanity (M6), estos tipos se podrán
// simplificar a los del api.
import type { PublishedMedia, PublishedSite, PublishedSpace } from '@hosteleria/api-client';
import type {
  Dish, DishCategory, Drink, DrinkCategory, Espacio, EspacioData, EspacioMenu, GrupoData, LegalPageDoc, Restaurant,
  RestaurantData, SanityImg, Wine, WineCategory
} from '@hosteleria/sanity-client';
import { markdownToBlocks } from './markdown';
import { withUiTextDefault } from './uiTextDefaults';

type I18n = Partial<Record<string, string>> | undefined;
type I18nField = { _key: string; value: string }[] | undefined;

/** `{ es: '…' }` → `[{ _key: 'es', value: '…' }]`, en el orden de los idiomas del restaurante. */
function i18n(value: I18n, locales: string[]): I18nField {
  if (!value) return undefined;
  const codes = [...locales.filter(c => c in value), ...Object.keys(value).filter(c => !locales.includes(c))];
  const out = codes.flatMap(code => (value[code] ? [{ _key: code, value: value[code]! }] : []));
  return out.length > 0 ? out : undefined;
}

/** Imagen del api con forma de imagen de Sanity; la URL viaja en `asset.url`. */
export type ApiImage = SanityImg & { asset: { _ref: string; url: string }; alt?: I18nField; width?: number; height?: number };

function image(id: string | null | undefined, media: Record<string, PublishedMedia>, locales: string[]): ApiImage | undefined {
  const m = id ? media[id] : undefined;
  if (!id || !m) return undefined;
  return {
    asset: { _ref: id, url: m.url },
    alt: i18n(m.alt, locales),
    ...(m.width ? { width: m.width } : {}),
    ...(m.height ? { height: m.height } : {})
  };
}

const UI_TEXT_FIELDS = {
  nav: {
    field: 'textosNav',
    keys: { place: 'linkLocal', kitchen: 'linkCocina', wines: 'linkVinos', gallery: 'linkGaleria', book: 'linkReservar' }
  },
  sections: {
    field: 'textosSecciones',
    keys: {
      dishesEyebrow: 'platosEyebrow', dishesTitle: 'platosTitulo', winesEyebrow: 'vinosEyebrow', winesTitle: 'vinosTitulo',
      winesFootnote: 'vinosNotaFinal', galleryEyebrow: 'galeriaEyebrow', galleryTitle: 'galeriaTitulo',
      drinksEyebrow: 'bebidasEyebrow', drinksTitle: 'bebidasTitulo'
    }
  },
  form: {
    field: 'textosForm',
    keys: {
      title: 'titulo', intro: 'intro', labelName: 'labelNombre', labelPhone: 'labelTelefono', labelEmail: 'labelEmail',
      labelGuests: 'labelComensales', labelDate: 'labelFecha', labelTime: 'labelHora', labelNotes: 'labelNotas',
      submit: 'submit', success: 'exito'
    }
  },
  footer: { field: 'textosFooter', keys: { contactColumn: 'colContacto', byline: 'bylineIzq' } }
} as const;

const LEGAL_TYPE = { 'legal-notice': 'aviso-legal', privacy: 'privacidad', cookies: 'cookies' } as const;

/** Quita las claves sin valor, como hace Sanity con los campos vacíos. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)) as T;
}

function orUndefined<T extends Record<string, unknown>>(obj: T): T | undefined {
  const c = compact(obj);
  return Object.keys(c).length > 0 ? c : undefined;
}

function address(a: { street?: string; postalCode?: string; city?: string; province?: string; district?: string; country?: string } | undefined) {
  return orUndefined({
    calle: a?.street, codigoPostal: a?.postalCode, ciudad: a?.city, provincia: a?.province, barrio: a?.district, pais: a?.country
  });
}

function toEspacio(s: PublishedSpace, index: number, media: Record<string, PublishedMedia>, locales: string[]): Espacio {
  const t = (v: I18n) => i18n(v, locales);
  return compact({
    _id: s.id,
    nombre: s.name,
    slug: { current: s.slug },
    tipo: s.type,
    orden: (index + 1) * 10,
    heroTitulo: t(s.hero?.title),
    heroSubtitulo: t(s.hero?.subtitle),
    heroMetaIzq: t(s.hero?.metaLeft),
    heroMetaDer: t(s.hero?.metaRight),
    heroNota: t(s.hero?.note),
    heroCta: t(s.hero?.cta),
    heroImagen: image(s.hero?.imageAssetId, media, locales),
    manifiestoEyebrow: t(s.manifesto?.eyebrow),
    manifiestoTexto: t(s.manifesto?.text),
    galeria: s.gallery?.length ? s.gallery.flatMap(id => image(id, media, locales) ?? []) : undefined,
    horariosTitulo: t(s.scheduleTexts?.title),
    horariosTexto: t(s.scheduleTexts?.text),
    horariosAbierto: t(s.scheduleTexts?.open),
    horariosProximaApertura: t(s.scheduleTexts?.nextOpening),
    horariosCerrado: t(s.scheduleTexts?.closed),
    horariosSemana: weekOf(s),
    direccion: address(s.address),
    mapaUrl: s.mapUrl ?? undefined,
    contactoReserva: orUndefined({ telefono: s.bookingContact?.phone, whatsapp: s.bookingContact?.whatsapp, email: s.bookingContact?.email })
  }) as Espacio;
}

function toRestaurant(site: PublishedSite): Restaurant {
  const r = site.restaurant;
  const locales = r.activeLocales;
  const media = site.media;
  const t = (v: I18n) => i18n(v, locales);
  const img = (id: string | undefined) => image(id, media, locales);

  const uiTexts = Object.fromEntries(
    (Object.keys(UI_TEXT_FIELDS) as (keyof typeof UI_TEXT_FIELDS)[]).flatMap(group => {
      const { field, keys } = UI_TEXT_FIELDS[group];
      const values = (r.uiTexts?.[group] ?? {}) as Record<string, I18n>;
      const out = compact(Object.fromEntries(Object.entries(keys).map(([from, to]) => [to, t(withUiTextDefault(group, from, values[from], locales))])));
      return Object.keys(out).length > 0 ? [[field, out]] : [];
    })
  );

  return compact({
    _id: `restaurante-${r.slug}`,
    nombre: r.name,
    slug: { current: r.slug },
    dominio: r.domain ? (/^https?:\/\//.test(r.domain) ? r.domain : `https://${r.domain}`) : undefined,
    logo: img(r.branding?.logoAssetId),
    favicon: img(r.branding?.faviconAssetId),
    iconoApp: img(r.branding?.appIconAssetId),
    idiomaPorDefecto: r.locales.find(l => l.code === r.defaultLocale)
      ? { codigo: r.defaultLocale, nombre: r.locales.find(l => l.code === r.defaultLocale)!.name }
      : { codigo: r.defaultLocale, nombre: r.defaultLocale },
    idiomasActivos: r.locales.map(l => ({ codigo: l.code, nombre: l.name })),
    anyoFundacion: r.foundedYear ?? undefined,
    espacios: site.spaces.map((s, i) => toEspacio(s, i, media, locales)),
    // El horario del restaurante es el de su espacio principal: lo usan el JSON-LD (Google) y llms.txt.
    horariosSemana: weekOf(site.spaces.find(s => s.isDefault) ?? site.spaces[0]),
    bloquesHome: r.homeBlocks?.length
      ? r.homeBlocks.map(b => compact({
          _key: b.id, titulo: t(b.title), texto: t(b.text), imagen: img(b.imageAssetId), ctaTexto: t(b.ctaText), ctaHref: b.ctaHref
        }))
      : undefined,
    sobreEyebrow: t(r.about?.eyebrow),
    sobreTitulo: t(r.about?.title),
    // Texto plano con párrafos separados por una línea en blanco → un bloque por párrafo.
    sobreCuerpo: r.about?.body
      ? t(r.about.body)?.map(entry => ({
          _key: entry._key,
          value: entry.value.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => ({ _type: 'block', children: [{ text: p }] }))
        }))
      : undefined,
    sobreImagenes: r.about?.imageAssetIds?.length ? r.about.imageAssetIds.flatMap(id => img(id) ?? []) : undefined,
    gruposEyebrow: t(r.groups?.eyebrow),
    gruposTitulo: t(r.groups?.title),
    gruposCta: t(r.groups?.cta),
    gruposImagen: img(r.groups?.imageAssetId),
    gruposDestacados: r.groups?.highlights?.length ? r.groups.highlights.map(h => compact({ _key: h.id, texto: t(h.text) })) : undefined,
    gruposFeatures: r.groups?.features?.length
      ? r.groups.features.map(f => compact({ _key: f.id, icon: f.icon, label: t(f.label), texto: t(f.text) }))
      : undefined,
    direccion: address(r.address),
    contacto: orUndefined({ telefono: r.contact?.phone, whatsapp: r.contact?.whatsapp, email: r.contact?.email, web: r.contact?.web }),
    mapaUrl: r.mapUrl ?? undefined,
    mostrarRedes: r.showSocials,
    redes: orUndefined({ instagram: r.socials?.instagram, facebook: r.socials?.facebook, tiktok: r.socials?.tiktok }),
    mostrarResenas: r.showReviews,
    ...uiTexts,
    seoTitulo: t(r.seo?.title),
    seoDescripcion: t(r.seo?.description),
    seoImagen: img(r.seo?.imageAssetId),
    resumenIA: t(r.aiSummary),
    aceptaReservas: r.acceptsBookings,
    precioMedio: r.business?.averagePrice,
    cloudflareAnalyticsToken: r.analyticsToken ?? undefined,
    formasPago: r.business?.paymentMethods?.length ? r.business.paymentMethods : undefined,
    serviciosExtras: r.business?.extraServices?.length ? r.business.extraServices : undefined,
    faqEyebrow: t(r.faq?.eyebrow),
    faqTitulo: t(r.faq?.title),
    faqTituloAcento: t(r.faq?.titleAccent),
    faq: r.faq?.items?.length ? r.faq.items.map(q => compact({ _key: q.id, pregunta: t(q.question), respuesta: t(q.answer) })) : undefined
  }) as Restaurant;
}

function menuOf(space: PublishedSpace | undefined, locales: string[]): EspacioMenu {
  const t = (v: I18n) => i18n(v, locales);
  const dishCategories: DishCategory[] = [];
  const dishes: Dish[] = [];
  const wineCategories: WineCategory[] = [];
  const wines: Wine[] = [];
  const drinkCategories: DrinkCategory[] = [];
  const drinks: Drink[] = [];
  (space?.drinkCategories ?? []).forEach((c, ci) => {
    const categoria = { _id: c.id, orden: (ci + 1) * 10, nombre: t(c.name) };
    drinkCategories.push(categoria);
    c.drinks.forEach((d, di) => drinks.push(compact({
      _id: d.id, nombre: t(d.name), nota: t(d.note), precio: d.price ?? undefined, orden: (di + 1) * 10, activo: true, categoria
    }) as Drink));
  });
  (space?.dishCategories ?? []).forEach((c, ci) => {
    const categoria = { _id: c.id, orden: (ci + 1) * 10, nombre: t(c.name) };
    dishCategories.push(categoria);
    c.dishes.forEach((d, di) => dishes.push(compact({
      _id: d.id, nombre: t(d.name), nota: t(d.note), precio: d.price ?? undefined, orden: (di + 1) * 10, activo: true, categoria
    }) as Dish));
  });
  (space?.wineCategories ?? []).forEach((c, ci) => {
    const categoria = { _id: c.id, orden: (ci + 1) * 10, nombre: t(c.name) };
    wineCategories.push(categoria);
    c.wines.forEach((w, wi) => wines.push(compact({
      _id: w.id, nombre: w.name, region: w.region ?? undefined, nota: t(w.note), precioCopa: w.priceGlass ?? undefined,
      precioBotella: w.priceBottle ?? undefined, orden: (wi + 1) * 10, activo: true, categoria
    }) as Wine));
  });
  return { dishCategories, dishes, wineCategories, wines, drinkCategories, drinks };
}

/** Ficha, espacios y la carta del espacio principal, como `fetchRestaurantData` de Sanity. */
export function toRestaurantData(site: PublishedSite): RestaurantData {
  return { restaurant: toRestaurant(site), ...menuOf(site.spaces[0], site.restaurant.activeLocales) };
}

/** La carta de un espacio concreto, para landings con varios. */
export function toSpaceMenu(site: PublishedSite, spaceId: string): EspacioMenu {
  return menuOf(site.spaces.find(s => s.id === spaceId), site.restaurant.activeLocales);
}

/** Ficha y espacios, sin cartas: para la portada de un grupo con varios espacios. */
export function toGroupData(site: PublishedSite): GrupoData {
  const restaurant = toRestaurant(site);
  return { restaurant, espacios: restaurant.espacios ?? [] };
}

/** Un espacio por su slug, con su carta; `null` si no existe o no está publicado. */
export function toSpaceData(site: PublishedSite, spaceSlug: string): EspacioData | null {
  const space = site.spaces.find(s => s.slug === spaceSlug);
  if (!space) return null;
  const restaurant = toRestaurant(site);
  const espacio = restaurant.espacios!.find(e => e.slug?.current === spaceSlug)!;
  return { restaurant, espacio, ...menuOf(space, site.restaurant.activeLocales) };
}

export function toLegalPages(site: PublishedSite): LegalPageDoc[] {
  const locales = site.restaurant.activeLocales;
  return site.legalPages.map((p, i) => compact({
    _id: `paginaLegal-${site.restaurant.slug}-${LEGAL_TYPE[p.type]}`,
    tipo: LEGAL_TYPE[p.type],
    titulo: i18n(p.title, locales),
    contenido: i18n(p.content, locales)?.map(entry => ({ _key: entry._key, value: markdownToBlocks(entry.value) })),
    ultimaActualizacion: p.lastUpdated ?? undefined,
    orden: (i + 1) * 10
  }) as LegalPageDoc);
}

/** Los turnos de la semana en la forma de Sanity. */
function weekOf(space: PublishedSite['spaces'][number] | undefined) {
  return space?.schedule.map(d => ({ dia: d.day, turnos: d.shifts.map(x => ({ apertura: x.open, cierre: x.close })) }));
}
