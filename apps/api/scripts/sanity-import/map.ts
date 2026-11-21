// Traducción de los documentos de Sanity al modelo del api. Sin red: solo datos.
// Los nombres de campo de entrada son los del dataset (en español).
import {
  EXTRA_SERVICES,
  GROUP_FEATURE_ICONS,
  PAYMENT_METHODS,
  UI_TEXT_KEYS,
  type UiTextGroup
} from '../../src/domain/models/restaurant.js';
import type { LegalPageType } from '../../src/domain/models/legalPage.js';

type I18n = Record<string, string>;
type Doc = Record<string, any>;

/** Avisos de lo que no se ha podido traducir tal cual; el volcado los enseña. */
export type Warn = (message: string) => void;

/** `[{ _key: 'es', value: '…' }]` → `{ es: '…' }`. Los idiomas vacíos no salen. */
export function i18n(field: unknown): I18n {
  const out: I18n = {};
  if (!Array.isArray(field)) return out;
  for (const entry of field) {
    if (entry && typeof entry._key === 'string' && typeof entry.value === 'string' && entry.value.trim() !== '') {
      out[entry._key] = entry.value;
    }
  }
  return out;
}

function blockText(block: Doc): string {
  return (block.children ?? []).map((c: Doc) => (typeof c.text === 'string' ? c.text : '')).join('');
}

/** Portable Text → texto plano; un párrafo por bloque, separados por una línea en blanco. */
export function portableToPlain(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter(b => b?._type === 'block')
    .map(blockText)
    .map(t => t.trim())
    .filter(Boolean)
    .join('\n\n');
}

const HEADING: Record<string, string> = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', blockquote: '> ' };

function spanMarkdown(span: Doc, markDefs: Doc[], warn: Warn): string {
  let text: string = typeof span.text === 'string' ? span.text : '';
  if (text.trim() === '') return text;
  for (const mark of (span.marks ?? []) as string[]) {
    // El énfasis va pegado al texto: los espacios de los extremos se quedan fuera.
    const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
    if (mark === 'strong') text = `${lead}**${core}**${trail}`;
    else if (mark === 'em') text = `${lead}*${core}*${trail}`;
    else {
      const def = markDefs.find(d => d._key === mark);
      if (def?._type === 'link' && typeof def.href === 'string') text = `${lead}[${core}](${def.href})${trail}`;
      else warn(`formato de texto sin equivalente en Markdown: «${def?._type ?? mark}»`);
    }
  }
  return text;
}

/** Portable Text → Markdown (títulos, listas, negrita, cursiva y enlaces). */
export function portableToMarkdown(blocks: unknown, warn: Warn = () => {}): string {
  if (!Array.isArray(blocks)) return '';
  const out: string[] = [];
  let previousList: string | null = null;
  let counter = 0;
  for (const block of blocks) {
    if (block?._type !== 'block') {
      warn(`bloque de tipo «${block?._type}» sin equivalente en Markdown`);
      continue;
    }
    const text = (block.children ?? []).map((c: Doc) => spanMarkdown(c, block.markDefs ?? [], warn)).join('').trim();
    if (text === '') continue;
    if (block.listItem) {
      // Una lista de otro tipo pegada a la anterior es otra lista.
      const sameList = previousList === block.listItem;
      counter = sameList ? counter + 1 : 1;
      const indent = '  '.repeat(Math.max(0, (block.level ?? 1) - 1));
      const line = `${indent}${block.listItem === 'number' ? `${counter}.` : '-'} ${text}`;
      if (sameList) out[out.length - 1] += `\n${line}`;
      else out.push(line);
      previousList = block.listItem;
      continue;
    }
    previousList = null;
    const style = block.style ?? 'normal';
    if (style !== 'normal' && !(style in HEADING)) warn(`estilo de párrafo «${style}» tratado como texto normal`);
    out.push(`${HEADING[style] ?? ''}${text}`);
  }
  return out.join('\n\n');
}

/** Campo i18n de Portable Text → un texto por idioma. */
function i18nPortable(field: unknown, convert: (blocks: unknown) => string): I18n {
  const out: I18n = {};
  if (!Array.isArray(field)) return out;
  for (const entry of field) {
    const text = typeof entry?._key === 'string' ? convert(entry.value) : '';
    if (text !== '') out[entry._key] = text;
  }
  return out;
}

const hasImage = (img: unknown): boolean => !!(img as Doc | undefined)?.asset;

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Quita las claves sin valor: el api guarda cada bloque tal como llega. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function address(d: Doc | undefined) {
  return compact({
    street: str(d?.calle), postalCode: str(d?.codigoPostal), city: str(d?.ciudad),
    province: str(d?.provincia), district: str(d?.barrio), country: str(d?.pais)
  });
}

/** `https://lapubilla.com/` → `lapubilla.com`: el api guarda el dominio sin protocolo. */
export function domainOf(value: unknown): string | undefined {
  return str(value)?.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

const UI_TEXT_SOURCE: { [G in UiTextGroup]: { field: string; keys: Record<string, (typeof UI_TEXT_KEYS)[G][number]> } } = {
  nav: {
    field: 'textosNav',
    keys: { linkLocal: 'place', linkCocina: 'kitchen', linkVinos: 'wines', linkGaleria: 'gallery', linkReservar: 'book' }
  },
  sections: {
    field: 'textosSecciones',
    keys: {
      platosEyebrow: 'dishesEyebrow', platosTitulo: 'dishesTitle', vinosEyebrow: 'winesEyebrow', vinosTitulo: 'winesTitle',
      vinosNotaFinal: 'winesFootnote', galeriaEyebrow: 'galleryEyebrow', galeriaTitulo: 'galleryTitle',
      bebidasEyebrow: 'drinksEyebrow', bebidasTitulo: 'drinksTitle'
    }
  },
  form: {
    field: 'textosForm',
    keys: {
      titulo: 'title', intro: 'intro', labelNombre: 'labelName', labelTelefono: 'labelPhone', labelEmail: 'labelEmail',
      labelComensales: 'labelGuests', labelFecha: 'labelDate', labelHora: 'labelTime', labelNotas: 'labelNotes',
      submit: 'submit', exito: 'success'
    }
  },
  footer: { field: 'textosFooter', keys: { colContacto: 'contactColumn', bylineIzq: 'byline' } }
};

function uiTexts(r: Doc, warn: Warn) {
  const out: Record<string, Record<string, I18n>> = {};
  for (const group of Object.keys(UI_TEXT_SOURCE) as UiTextGroup[]) {
    const { field, keys } = UI_TEXT_SOURCE[group];
    const source: Doc = r[field] ?? {};
    const values: Record<string, I18n> = {};
    for (const [from, value] of Object.entries(source)) {
      if (from.startsWith('_')) continue;
      const to = keys[from];
      if (!to) { warn(`texto de interfaz sin sitio en el api: ${field}.${from}`); continue; }
      const text = i18n(value);
      if (Object.keys(text).length > 0) values[to] = text;
    }
    if (Object.keys(values).length > 0) out[group] = values;
  }
  return out;
}

function known<T extends string>(values: unknown, allowed: readonly T[], label: string, warn: Warn): T[] | undefined {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const out: T[] = [];
  for (const v of values) {
    if ((allowed as readonly string[]).includes(v)) out.push(v as T);
    else warn(`${label}: valor «${v}» que el api no conoce`);
  }
  return out;
}

export interface RestaurantImport {
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
  /** Los bloques de contenido, cada uno completo. */
  content: Record<string, unknown>;
}

export function mapRestaurant(r: Doc, warn: Warn = () => {}): RestaurantImport {
  for (const field of ['logo', 'favicon', 'iconoApp', 'seoImagen', 'gruposImagen']) {
    if (hasImage(r[field])) warn(`imagen sin copiar: ${field}`);
  }
  if ((r.sobreImagenes ?? []).some(hasImage)) warn('imágenes sin copiar: sobreImagenes');

  const token = str(r.cloudflareAnalyticsToken);
  const realToken = token && !token.startsWith('[') ? token : undefined;
  if (token && !realToken) warn('el token de analítica es un texto de relleno: se deja vacío');

  const content = {
    name: str(r.nombre),
    domain: domainOf(r.dominio),
    acceptsBookings: r.aceptaReservas !== false,
    showSocials: r.mostrarRedes === true,
    showReviews: r.mostrarResenas === true,
    foundedYear: typeof r.anyoFundacion === 'number' ? r.anyoFundacion : null,
    address: address(r.direccion),
    contact: compact({
      phone: str(r.contacto?.telefono), whatsapp: str(r.contacto?.whatsapp),
      email: str(r.contacto?.email), web: str(r.contacto?.web)
    }),
    socials: compact({
      instagram: str(r.redes?.instagram), facebook: str(r.redes?.facebook), tiktok: str(r.redes?.tiktok)
    }),
    mapUrl: str(r.mapaUrl) ?? null,
    seo: nonEmptyI18n({ title: i18n(r.seoTitulo), description: i18n(r.seoDescripcion) }),
    about: nonEmptyI18n({
      eyebrow: i18n(r.sobreEyebrow), title: i18n(r.sobreTitulo), body: i18nPortable(r.sobreCuerpo, portableToPlain)
    }),
    groups: {
      ...nonEmptyI18n({ eyebrow: i18n(r.gruposEyebrow), title: i18n(r.gruposTitulo), cta: i18n(r.gruposCta) }),
      ...listIfAny('highlights', (r.gruposDestacados ?? []).map((h: Doc, i: number) => ({
        id: itemId(h, 'h', i), ...nonEmptyI18n({ text: i18n(h.texto) })
      }))),
      ...listIfAny('features', (r.gruposFeatures ?? []).flatMap((f: Doc, i: number) => {
        if (!(GROUP_FEATURE_ICONS as readonly string[]).includes(f.icon)) {
          warn(`ventaja de grupos ${i + 1}: icono «${f.icon}» que el api no conoce; no se copia`);
          return [];
        }
        return [{ id: itemId(f, 'f', i), icon: f.icon, ...nonEmptyI18n({ label: i18n(f.label), text: i18n(f.texto) }) }];
      }))
    },
    homeBlocks: (r.bloquesHome ?? []).map((b: Doc, i: number) => {
      if (hasImage(b.imagen)) warn(`imagen sin copiar: bloque destacado ${i + 1}`);
      return compact({
        id: itemId(b, 'b', i),
        ...nonEmptyI18n({ title: i18n(b.titulo), text: i18n(b.texto), ctaText: i18n(b.ctaTexto) }),
        ctaHref: str(b.ctaHref)
      });
    }),
    faq: {
      ...nonEmptyI18n({ eyebrow: i18n(r.faqEyebrow), title: i18n(r.faqTitulo), titleAccent: i18n(r.faqTituloAcento) }),
      ...listIfAny('items', (r.faq ?? []).map((q: Doc, i: number) => ({
        id: itemId(q, 'q', i), ...nonEmptyI18n({ question: i18n(q.pregunta), answer: i18n(q.respuesta) })
      })))
    },
    uiTexts: uiTexts(r, warn),
    aiSummary: i18n(r.resumenIA),
    analyticsToken: realToken ?? null,
    business: compact({
      averagePrice: typeof r.precioMedio === 'number' ? r.precioMedio : undefined,
      paymentMethods: known(r.formasPago, PAYMENT_METHODS, 'formas de pago', warn),
      extraServices: known(r.serviciosExtras, EXTRA_SERVICES, 'servicios', warn)
    })
  };

  const activeLocaleCodes: string[] = (r.idiomasActivos ?? []).filter((c: unknown) => typeof c === 'string');
  return {
    defaultLocaleCode: r.idiomaPorDefecto ?? activeLocaleCodes[0],
    activeLocaleCodes,
    content: compact(content)
  };
}

function nonEmptyI18n<T extends Record<string, I18n>>(fields: T): Partial<T> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => Object.keys(v).length > 0)) as Partial<T>;
}

function listIfAny<K extends string, T>(key: K, list: T[]): Partial<Record<K, T[]>> {
  return (list.length > 0 ? { [key]: list } : {}) as Partial<Record<K, T[]>>;
}

function itemId(item: Doc, prefix: string, index: number): string {
  const key = str(item._key);
  return key && key.length <= 40 ? key : `${prefix}${index + 1}`;
}

const SPACE_TYPES = ['restaurant', 'cafe', 'coctel', 'club', 'terraza', 'live_music', 'otro'];
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export interface SpaceImport {
  sourceId: string;
  slug: string;
  name: string;
  type: string;
  content: Record<string, unknown>;
  /** Los siete días, de lunes a domingo. */
  schedule: { day: string; shifts: { open: string; close: string }[] }[];
}

export function mapSpace(e: Doc, warn: Warn = () => {}): SpaceImport {
  if (hasImage(e.heroImagen)) warn(`imagen sin copiar: portada de «${e.nombre}»`);
  if ((e.galeria ?? []).some(hasImage)) warn(`imágenes sin copiar: galería de «${e.nombre}»`);
  const type = SPACE_TYPES.includes(e.tipo) ? e.tipo : 'restaurant';
  if (e.tipo && type !== e.tipo) warn(`espacio «${e.nombre}»: tipo «${e.tipo}» que el api no conoce; queda como restaurante`);
  return {
    sourceId: e._id,
    slug: e.slug?.current,
    name: e.nombre,
    type,
    content: {
      hero: nonEmptyI18n({
        title: i18n(e.heroTitulo), subtitle: i18n(e.heroSubtitulo), metaLeft: i18n(e.heroMetaIzq),
        metaRight: i18n(e.heroMetaDer), note: i18n(e.heroNota), cta: i18n(e.heroCta)
      }),
      manifesto: nonEmptyI18n({ eyebrow: i18n(e.manifiestoEyebrow), text: i18n(e.manifiestoTexto) }),
      scheduleTexts: nonEmptyI18n({
        title: i18n(e.horariosTitulo), text: i18n(e.horariosTexto), open: i18n(e.horariosAbierto),
        nextOpening: i18n(e.horariosProximaApertura), closed: i18n(e.horariosCerrado)
      }),
      address: address(e.direccion),
      mapUrl: str(e.mapaUrl) ?? null,
      bookingContact: compact({
        phone: str(e.contactoReserva?.telefono), whatsapp: str(e.contactoReserva?.whatsapp), email: str(e.contactoReserva?.email)
      })
    },
    schedule: WEEK.map(day => ({
      day,
      shifts: ((e.horariosSemana ?? []).find((d: Doc) => d.dia === day)?.turnos ?? [])
        .filter((t: Doc) => str(t.apertura) && str(t.cierre))
        .map((t: Doc) => ({ open: t.apertura, close: t.cierre }))
    }))
  };
}

/** El api ordena con enteros desde 0; Sanity usa 10, 20, 30… */
function order(value: unknown, index: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : index;
}

export interface CategoryImport { sourceId: string; name: I18n; order: number }
export interface DishImport {
  sourceId: string; categorySourceId: string; name: I18n; note: I18n; price: number | null; order: number; active: boolean;
}
export interface WineImport {
  sourceId: string; categorySourceId: string; name: string; region: string | null; note: I18n;
  priceGlass: number | null; priceBottle: number | null; order: number; active: boolean;
}

export function mapCategory(c: Doc, index: number): CategoryImport {
  return { sourceId: c._id, name: i18n(c.nombre), order: order(c.orden, index) };
}

const num = (v: unknown): number | null => (typeof v === 'number' && v >= 0 ? v : null);

export function mapDish(d: Doc, index: number): DishImport {
  return {
    sourceId: d._id, categorySourceId: d.categoria?._ref, name: i18n(d.nombre), note: i18n(d.nota),
    price: num(d.precio), order: order(d.orden, index), active: d.activo !== false
  };
}

export function mapWine(w: Doc, index: number): WineImport {
  return {
    sourceId: w._id, categorySourceId: w.categoria?._ref, name: str(w.nombre) ?? '', region: str(w.region) ?? null,
    note: i18n(w.nota), priceGlass: num(w.precioCopa), priceBottle: num(w.precioBotella),
    order: order(w.orden, index), active: w.activo !== false
  };
}

const LEGAL_TYPE: Record<string, LegalPageType> = { 'aviso-legal': 'legal-notice', privacidad: 'privacy', cookies: 'cookies' };

export interface LegalPageImport { type: LegalPageType; title: I18n; content: I18n; lastUpdated: string | null }

export function mapLegalPage(p: Doc, warn: Warn = () => {}): LegalPageImport | null {
  const type = LEGAL_TYPE[p.tipo];
  if (!type) { warn(`página legal de tipo «${p.tipo}» que el api no conoce; no se copia`); return null; }
  return {
    type,
    title: i18n(p.titulo),
    content: i18nPortable(p.contenido, blocks => portableToMarkdown(blocks, m => warn(`${p.tipo}: ${m}`))),
    lastUpdated: /^\d{4}-\d{2}-\d{2}$/.test(p.ultimaActualizacion ?? '') ? p.ultimaActualizacion : null
  };
}

/** Comparación sin depender del orden de las claves (jsonb no lo conserva). */
export function canonical(value: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(sort)
      : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x as object).sort().map(k => [k, sort((x as Doc)[k])]))
        : x;
  return JSON.stringify(sort(value));
}
