import { z } from 'zod';
import type { ExtraService, GroupFeatureIcon, PaymentMethod, Restaurant, UiTexts } from '@hosteleria/api-client';
import type { ApiClient } from '@hosteleria/api-client';
import { compact, i18nFromForm, i18nToForm, sameContent, type I18nValues } from '@/lib/forms/i18n';
import { priceFromForm, priceText, priceToForm } from '@/lib/forms/price';
import { i18nValues, optionalEmail, optionalMap, optionalText, optionalUrl, requiredText } from '@/lib/forms/rules';
import type { TranslatableField } from '@/lib/forms/translations';

// ─── Opciones cerradas ───────────────────────────────────────────

export const FEATURE_ICONS: { value: GroupFeatureIcon; label: string }[] = [
  { value: 'users', label: 'Personas (aforo)' },
  { value: 'chef', label: 'Cocinero (menú)' },
  { value: 'wine', label: 'Copa (vinos)' },
  { value: 'clock', label: 'Reloj (horario)' },
  { value: 'pin', label: 'Ubicación (sala)' },
  { value: 'star', label: 'Estrella (celebración)' }
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'debit_card', label: 'Tarjeta de débito' },
  { value: 'contactless', label: 'Pago sin contacto' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'google_pay', label: 'Google Pay' },
  { value: 'bizum', label: 'Bizum' }
];

/** Agrupados como se piensan: lo que se come, cómo es el local y para quién es cómodo. */
export const EXTRA_SERVICES: { value: ExtraService; label: string; group: string }[] = [
  { value: 'vegetariano', label: 'Opciones vegetarianas', group: 'Comida' },
  { value: 'vegano', label: 'Opciones veganas', group: 'Comida' },
  { value: 'sin_gluten', label: 'Opciones sin gluten', group: 'Comida' },
  { value: 'menu_dia', label: 'Menú del día', group: 'Comida' },
  { value: 'menu_degustacion', label: 'Menú degustación', group: 'Comida' },
  { value: 'carta_vinos', label: 'Carta de vinos amplia', group: 'Comida' },
  { value: 'terraza', label: 'Terraza', group: 'El local' },
  { value: 'sala_privada', label: 'Sala privada o reservado', group: 'El local' },
  { value: 'grupos', label: 'Grupos y eventos', group: 'El local' },
  { value: 'bar', label: 'Bar o vermut', group: 'El local' },
  { value: 'coctel', label: 'Coctelería', group: 'El local' },
  { value: 'live_music', label: 'Música en directo', group: 'El local' },
  { value: 'familiar', label: 'Para ir con niños', group: 'Familias y accesibilidad' },
  { value: 'pet_friendly', label: 'Admite mascotas', group: 'Familias y accesibilidad' },
  { value: 'accesible', label: 'Accesible en silla de ruedas', group: 'Familias y accesibilidad' },
  { value: 'aparcamiento', label: 'Aparcamiento cerca', group: 'Familias y accesibilidad' }
];

// ─── Textos de la plantilla que redacta el restaurante ───────────

// El menú, las etiquetas del formulario y «Contacto» los pone el código
// (`packages/content-client`); aquí solo van los que cambian de un local a otro,
// cada bloque en la sección donde se ve.

type UiTextGroup = keyof UiTexts;

export interface UiTextField {
  group: UiTextGroup;
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
}

export const MENU_TITLES = 'Títulos de la carta en la web';
export const GALLERY_TITLES = 'Título de la galería en la web';
export const BOOKING_TEXTS = 'Formulario de reserva';
export const FOOTER_TEXTS = 'Pie de la web';

export const UI_TEXT_BLOCKS: { title: string; fields: UiTextField[] }[] = [
  {
    title: MENU_TITLES,
    fields: [
      { group: 'sections', key: 'dishesEyebrow', label: 'Carta: antetítulo', hint: 'La frase corta sobre el título, por ejemplo «Nuestra cocina».' },
      { group: 'sections', key: 'dishesTitle', label: 'Carta: título', hint: 'Por ejemplo, «Carta de temporada».' },
      { group: 'sections', key: 'winesEyebrow', label: 'Vinos: antetítulo', hint: 'Por ejemplo, «Esta noche, por copa».' },
      { group: 'sections', key: 'winesTitle', label: 'Vinos: título', hint: 'Por ejemplo, «La carta breve».' },
      { group: 'sections', key: 'winesFootnote', label: 'Vinos: nota al final de la lista', hint: 'Por ejemplo, «Referencias por botella a consultar».', multiline: true },
      { group: 'sections', key: 'drinksEyebrow', label: 'Bebidas: antetítulo', hint: 'Por ejemplo, «Tras la barra».' },
      { group: 'sections', key: 'drinksTitle', label: 'Bebidas: título', hint: 'Por ejemplo, «Para beber».' }
    ]
  },
  {
    title: GALLERY_TITLES,
    fields: [
      { group: 'sections', key: 'galleryEyebrow', label: 'Antetítulo', hint: 'Por ejemplo, «El local».' },
      { group: 'sections', key: 'galleryTitle', label: 'Título', hint: 'Por ejemplo, «Nuestro espacio».' }
    ]
  },
  {
    title: BOOKING_TEXTS,
    fields: [
      { group: 'form', key: 'title', label: 'Título', hint: 'Por ejemplo, «Reserva tu mesa».' },
      { group: 'form', key: 'intro', label: 'Texto de entrada', hint: 'Una frase que invite a reservar.', multiline: true }
    ]
  },
  {
    title: FOOTER_TEXTS,
    fields: [{ group: 'footer', key: 'byline', label: 'Frase del pie', hint: 'Por ejemplo, «Cocina de mercado en Barcelona».' }]
  }
];

const UI_TEXT_FIELDS = UI_TEXT_BLOCKS.flatMap(b => b.fields);

/** Las bebidas solo tienen títulos si el restaurante ya los usa (Ocaña). */
const DRINKS_KEYS = ['drinksEyebrow', 'drinksTitle'];

export function visibleUiTextFields(fields: UiTextField[], restaurant: Restaurant): UiTextField[] {
  const sections = (restaurant.uiTexts.sections ?? {}) as Record<string, Record<string, string> | undefined>;
  return fields.filter(f => !DRINKS_KEYS.includes(f.key) || Object.values(sections[f.key] ?? {}).some(Boolean));
}

// ─── Esquema ─────────────────────────────────────────────────────

const assetId = z.string();
const thisYear = new Date().getFullYear();

export const schema = z.object({
  name: requiredText(120),
  // Sin protocolo: `www.mirestaurante.com`. Solo la cambia un administrador.
  domain: z.string().trim().toLowerCase()
    .transform(v => v.replace(/^https?:\/\//, '').replace(/\/+$/, ''))
    .pipe(z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, 'Escribe la dirección de la web, por ejemplo «www.mirestaurante.com».')),
  foundedYear: z
    .string()
    .trim()
    .refine(v => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1500 && Number(v) <= thisYear), 'Escribe el año con cuatro cifras, por ejemplo 1987.'),
  branding: z.object({ logoAssetId: assetId, faviconAssetId: assetId, appIconAssetId: assetId }),
  address: z.object({
    street: optionalText(200),
    postalCode: optionalText(20),
    city: optionalText(120),
    district: optionalText(120),
    province: optionalText(120),
    country: optionalText(120)
  }),
  mapUrl: optionalMap,
  contact: z.object({
    phone: optionalText(40),
    whatsapp: optionalText(40),
    email: optionalEmail,
    web: optionalUrl
  }),
  socials: z.object({
    instagram: optionalUrl,
    facebook: optionalUrl,
    tiktok: optionalUrl
  }),
  showSocials: z.boolean(),
  acceptsBookings: z.boolean(),
  about: z.object({ eyebrow: i18nValues, title: i18nValues, body: i18nValues, imageAssetIds: z.array(assetId) }),
  groups: z.object({
    eyebrow: i18nValues,
    title: i18nValues,
    cta: i18nValues,
    imageAssetId: assetId,
    highlights: z.array(z.object({ id: z.string(), text: i18nValues })),
    features: z.array(z.object({ id: z.string(), icon: z.enum(['users', 'chef', 'wine', 'clock', 'pin', 'star']), label: i18nValues, text: i18nValues }))
  }),
  faq: z.object({
    eyebrow: i18nValues,
    title: i18nValues,
    titleAccent: i18nValues,
    items: z.array(z.object({ id: z.string(), question: i18nValues, answer: i18nValues }))
  }),
  homeBlocks: z.array(z.object({
    id: z.string(),
    title: i18nValues,
    text: i18nValues,
    imageAssetId: assetId,
    ctaText: i18nValues,
    ctaHref: optionalText(500)
  })),
  uiTexts: z.object({
    nav: z.record(i18nValues),
    sections: z.record(i18nValues),
    form: z.record(i18nValues),
    footer: z.record(i18nValues)
  }),
  seo: z.object({ title: i18nValues, description: i18nValues, imageAssetId: assetId }),
  business: z.object({
    averagePrice: priceText,
    paymentMethods: z.array(z.string()),
    extraServices: z.array(z.string())
  }),
  aiSummary: i18nValues,
  analyticsToken: optionalText(200)
});

export type FormValues = z.infer<typeof schema>;

// ─── Del api al formulario ───────────────────────────────────────

/** En el orden de la lista de opciones: así marcar y desmarcar vuelve al valor inicial. */
function inOptionOrder<T extends string>(values: T[] | undefined, options: { value: T }[]): T[] {
  return options.map(o => o.value).filter(v => values?.includes(v));
}

export function toForm(r: Restaurant): FormValues {
  const locales = r.activeLocales as string[];
  const tx = (value: Record<string, string | undefined> | undefined) => i18nToForm(value, locales);
  const uiGroup = (group: UiTextGroup) => {
    const values = (r.uiTexts[group] ?? {}) as Record<string, Record<string, string> | undefined>;
    return Object.fromEntries(UI_TEXT_FIELDS.filter(f => f.group === group).map(f => [f.key, tx(values[f.key])]));
  };

  return {
    name: r.name,
    domain: r.domain,
    foundedYear: r.foundedYear ? String(r.foundedYear) : '',
    branding: {
      logoAssetId: r.branding.logoAssetId ?? '',
      faviconAssetId: r.branding.faviconAssetId ?? '',
      appIconAssetId: r.branding.appIconAssetId ?? ''
    },
    address: {
      street: r.address.street ?? '',
      postalCode: r.address.postalCode ?? '',
      city: r.address.city ?? '',
      district: r.address.district ?? '',
      province: r.address.province ?? '',
      country: r.address.country ?? ''
    },
    mapUrl: r.mapUrl ?? '',
    contact: {
      phone: r.contact.phone ?? '',
      whatsapp: r.contact.whatsapp ?? '',
      email: r.contact.email ?? '',
      web: r.contact.web ?? ''
    },
    socials: {
      instagram: r.socials.instagram ?? '',
      facebook: r.socials.facebook ?? '',
      tiktok: r.socials.tiktok ?? ''
    },
    showSocials: r.showSocials,
    acceptsBookings: r.acceptsBookings,
    about: {
      eyebrow: tx(r.about.eyebrow),
      title: tx(r.about.title),
      body: tx(r.about.body),
      imageAssetIds: r.about.imageAssetIds ?? []
    },
    groups: {
      eyebrow: tx(r.groups.eyebrow),
      title: tx(r.groups.title),
      cta: tx(r.groups.cta),
      imageAssetId: r.groups.imageAssetId ?? '',
      highlights: (r.groups.highlights ?? []).map(h => ({ id: h.id, text: tx(h.text) })),
      features: (r.groups.features ?? []).map(f => ({ id: f.id, icon: f.icon, label: tx(f.label), text: tx(f.text) }))
    },
    faq: {
      eyebrow: tx(r.faq.eyebrow),
      title: tx(r.faq.title),
      titleAccent: tx(r.faq.titleAccent),
      items: (r.faq.items ?? []).map(q => ({ id: q.id, question: tx(q.question), answer: tx(q.answer) }))
    },
    homeBlocks: r.homeBlocks.map(b => ({
      id: b.id,
      title: tx(b.title),
      text: tx(b.text),
      imageAssetId: b.imageAssetId ?? '',
      ctaText: tx(b.ctaText),
      ctaHref: b.ctaHref ?? ''
    })),
    uiTexts: { nav: uiGroup('nav'), sections: uiGroup('sections'), form: uiGroup('form'), footer: uiGroup('footer') },
    seo: {
      title: tx(r.seo.title),
      description: tx(r.seo.description),
      imageAssetId: r.seo.imageAssetId ?? ''
    },
    business: {
      averagePrice: priceToForm(r.business.averagePrice),
      paymentMethods: inOptionOrder(r.business.paymentMethods, PAYMENT_METHODS),
      extraServices: inOptionOrder(r.business.extraServices, EXTRA_SERVICES)
    },
    aiSummary: tx(r.aiSummary),
    analyticsToken: r.analyticsToken ?? ''
  };
}

// ─── Del formulario al api ───────────────────────────────────────

type PatchInput = Parameters<ApiClient['restaurants']['patch']>[1];

/**
 * El api sustituye cada bloque entero, así que se envían completos. Los textos
 * parten del valor guardado para no perder idiomas que ya no están activos.
 */
export function toPatch(values: FormValues, r: Restaurant): PatchInput {
  const tx = (original: Record<string, string | undefined> | undefined, form: I18nValues) => i18nFromForm(original, form);
  const byId = <T extends { id: string }>(list: T[] | undefined, id: string) => list?.find(item => item.id === id);
  const uiGroup = <G extends UiTextGroup>(group: G) => {
    const original = (r.uiTexts[group] ?? {}) as Record<string, Record<string, string> | undefined>;
    const out: Record<string, Record<string, string>> = {};
    // Lo que el formulario no enseña (p. ej. los títulos de bebidas) se conserva tal cual.
    for (const [key, value] of Object.entries(original)) if (value) out[key] = value;
    for (const [key, form] of Object.entries(values.uiTexts[group])) out[key] = tx(original[key], form);
    return out as NonNullable<UiTexts[G]>;
  };
  const averagePrice = priceFromForm(values.business.averagePrice);

  return {
    name: values.name,
    domain: values.domain,
    foundedYear: values.foundedYear ? Number(values.foundedYear) : null,
    branding: compact(values.branding),
    address: compact(values.address),
    mapUrl: values.mapUrl || null,
    contact: compact(values.contact),
    socials: compact(values.socials),
    showSocials: values.showSocials,
    acceptsBookings: values.acceptsBookings,
    about: {
      eyebrow: tx(r.about.eyebrow, values.about.eyebrow),
      title: tx(r.about.title, values.about.title),
      body: tx(r.about.body, values.about.body),
      imageAssetIds: values.about.imageAssetIds
    },
    groups: {
      eyebrow: tx(r.groups.eyebrow, values.groups.eyebrow),
      title: tx(r.groups.title, values.groups.title),
      cta: tx(r.groups.cta, values.groups.cta),
      ...(values.groups.imageAssetId ? { imageAssetId: values.groups.imageAssetId } : {}),
      highlights: values.groups.highlights.map(h => ({ id: h.id, text: tx(byId(r.groups.highlights, h.id)?.text, h.text) })),
      features: values.groups.features.map(f => {
        const original = byId(r.groups.features, f.id);
        return { id: f.id, icon: f.icon, label: tx(original?.label, f.label), text: tx(original?.text, f.text) };
      })
    },
    faq: {
      eyebrow: tx(r.faq.eyebrow, values.faq.eyebrow),
      title: tx(r.faq.title, values.faq.title),
      titleAccent: tx(r.faq.titleAccent, values.faq.titleAccent),
      items: values.faq.items.map(q => {
        const original = byId(r.faq.items, q.id);
        return { id: q.id, question: tx(original?.question, q.question), answer: tx(original?.answer, q.answer) };
      })
    },
    homeBlocks: values.homeBlocks.map(b => {
      const original = byId(r.homeBlocks, b.id);
      return {
        id: b.id,
        title: tx(original?.title, b.title),
        text: tx(original?.text, b.text),
        ctaText: tx(original?.ctaText, b.ctaText),
        ...(b.imageAssetId ? { imageAssetId: b.imageAssetId } : {}),
        ...(b.ctaHref ? { ctaHref: b.ctaHref } : {})
      };
    }),
    uiTexts: { nav: uiGroup('nav'), sections: uiGroup('sections'), form: uiGroup('form'), footer: uiGroup('footer') },
    seo: {
      title: tx(r.seo.title, values.seo.title),
      description: tx(r.seo.description, values.seo.description),
      ...(values.seo.imageAssetId ? { imageAssetId: values.seo.imageAssetId } : {})
    },
    business: {
      ...(averagePrice !== null ? { averagePrice } : {}),
      paymentMethods: values.business.paymentMethods as PaymentMethod[],
      extraServices: values.business.extraServices as ExtraService[]
    },
    aiSummary: tx(r.aiSummary, values.aiSummary),
    analyticsToken: values.analyticsToken || null,
    // Guardar nunca publica: deja el contenido como borrador hasta que se pulse Publicar.
    state: 'draft'
  };
}

// ─── Qué cambia respecto a lo publicado ──────────────────────────

export const GOOGLE = 'Cómo aparece en Google';

/** Bloques que difieren de lo último publicado, con el nombre que ve el editor. */
export function changedBlocks(r: Restaurant): string[] {
  const snap = r.publishedSnapshot;
  if (!snap) return [];
  const blocks: [string, unknown, unknown][] = [
    ['Nombre', r.name, snap.name],
    ['Dirección', r.address, snap.address],
    ['Contacto', r.contact, snap.contact],
    ['Redes sociales', r.socials, snap.socials],
    [GOOGLE, r.seo, snap.seo],
    ['Reservas online', r.acceptsBookings, snap.acceptsBookings],
    ['Mostrar redes en la web', r.showSocials, snap.showSocials],
    ['Dirección de la web', r.domain, snap.domain]
  ];
  // Lo publicado antes de que existieran estos campos no los trae: sin
  // referencia no se puede decir que hayan cambiado.
  const later: [string, unknown, unknown][] = [
    ['Año de apertura', r.foundedYear, snap.foundedYear],
    [BRAND_ICON, r.branding, snap.branding],
    ['Mapa', r.mapUrl, snap.mapUrl],
    ['Sobre nosotros', r.about, snap.about],
    ['Grupos y eventos', r.groups, snap.groups],
    ['Preguntas frecuentes', r.faq, snap.faq],
    ['Bloques destacados', r.homeBlocks, snap.homeBlocks],
    ['Títulos y textos de la web', r.uiTexts, snap.uiTexts],
    ['Datos del negocio', r.business, snap.business],
    ['Resumen para asistentes de IA', r.aiSummary, snap.aiSummary],
    ['Analítica', r.analyticsToken, snap.analyticsToken]
  ];
  blocks.push(...later.filter(([, , before]) => before !== undefined));
  // Los idiomas llegan a la web al publicar, como el resto.
  if (snap.activeLocaleCodes) blocks.push(['Idiomas de la web', [...r.activeLocales].sort(), [...snap.activeLocaleCodes].sort()]);
  if (snap.defaultLocaleCode) blocks.push(['Idioma principal', r.defaultLocale, snap.defaultLocaleCode]);
  return blocks.filter(([, now, before]) => !sameContent(now, before)).map(([label]) => label);
}

// ─── Textos traducibles ──────────────────────────────────────────

export const ABOUT = 'Sobre nosotros';
export const GROUPS = 'Grupos y eventos';
export const FAQ = 'Preguntas frecuentes';
export const HOME_BLOCKS = 'Bloques destacados';
export const AI = 'Resumen para asistentes de IA';
export const BRAND_ICON = 'Icono de la web';

/** Textos traducibles del formulario tal como está ahora: las listas cambian de tamaño. */
export function translatableFields(values: Partial<FormValues>, restaurant: Restaurant): TranslatableField[] {
  const fields: TranslatableField[] = [
    { name: 'about.eyebrow', label: 'Antetítulo', section: ABOUT },
    { name: 'about.title', label: 'Título', section: ABOUT },
    { name: 'about.body', label: 'Texto', section: ABOUT },
    { name: 'groups.eyebrow', label: 'Antetítulo', section: GROUPS },
    { name: 'groups.title', label: 'Título', section: GROUPS },
    { name: 'groups.cta', label: 'Texto del botón', section: GROUPS }
  ];
  values.groups?.highlights?.forEach((_, i) => fields.push({ name: `groups.highlights.${i}.text`, label: `Punto destacado ${i + 1}`, section: GROUPS }));
  values.groups?.features?.forEach((_, i) => {
    fields.push({ name: `groups.features.${i}.label`, label: `Ventaja ${i + 1}, título`, section: GROUPS });
    fields.push({ name: `groups.features.${i}.text`, label: `Ventaja ${i + 1}, texto`, section: GROUPS });
  });
  fields.push(
    { name: 'faq.eyebrow', label: 'Antetítulo', section: FAQ },
    { name: 'faq.title', label: 'Título', section: FAQ },
    { name: 'faq.titleAccent', label: 'Parte destacada del título', section: FAQ }
  );
  values.faq?.items?.forEach((_, i) => {
    fields.push({ name: `faq.items.${i}.question`, label: `Pregunta ${i + 1}`, section: FAQ });
    fields.push({ name: `faq.items.${i}.answer`, label: `Respuesta ${i + 1}`, section: FAQ });
  });
  values.homeBlocks?.forEach((_, i) => {
    fields.push({ name: `homeBlocks.${i}.title`, label: `Bloque ${i + 1}, título`, section: HOME_BLOCKS });
    fields.push({ name: `homeBlocks.${i}.text`, label: `Bloque ${i + 1}, texto`, section: HOME_BLOCKS });
    fields.push({ name: `homeBlocks.${i}.ctaText`, label: `Bloque ${i + 1}, texto del botón`, section: HOME_BLOCKS });
  });
  for (const { title, fields: blockFields } of UI_TEXT_BLOCKS) {
    for (const f of visibleUiTextFields(blockFields, restaurant)) {
      fields.push({ name: `uiTexts.${f.group}.${f.key}`, label: f.label, section: title });
    }
  }
  fields.push(
    { name: 'seo.title', label: 'Título', section: GOOGLE },
    { name: 'seo.description', label: 'Descripción', section: GOOGLE },
    { name: 'aiSummary', label: 'Resumen', section: AI }
  );
  return fields;
}
