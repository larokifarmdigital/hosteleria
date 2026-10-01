/**
 * Mock data para la fase UI del backoffice.
 *
 * Contenido idéntico al mockup HTML v17 aprobado — 6 restaurantes reales
 * del grupo, sus espacios, cartas mínimas, media, idiomas, usuarios,
 * tareas pendientes y estado del sistema.
 *
 * Cuando arranque apps/api, cambiar los imports de este fichero por
 * fetch/server actions; los shapes ya coinciden con los types.
 */

import type {
  Restaurant,
  Space,
  Dish,
  Wine,
  DishCategory,
  WineCategory,
  Language,
  User,
  MediaAsset,
  PendingTask,
  SystemService,
  RebuildRow
} from './types';

// ─────────────────────────────────────────────────────────────────
// Restaurants
// ─────────────────────────────────────────────────────────────────
export const RESTAURANTS: Restaurant[] = [
  {
    id: 'r-casabella',
    slug: 'casabella',
    name: 'Casabella',
    domain: 'restaurantcasabella.com',
    logoInitial: 'C',
    coverGradient: 'linear-gradient(135deg,#b8935a,#7a3a2a)',
    state: 'published',
    activeLocales: ['es', 'ca', 'en'],
    defaultLocale: 'es',
    completePercent: 96,
    spacesCount: 1,
    dishesCount: 32,
    winesCount: 18,
    address: { street: 'Carrer de la Cera 12', postalCode: '08001', city: 'Barcelona', district: 'El Raval', country: 'España' },
    contact: { phone: '+34 933 12 34 56', whatsapp: '+34 655 12 34 56', email: 'hola@casabella.cat' },
    socials: { instagram: 'https://instagram.com/restaurante.casabella' },
    showSocials: true, timezone: 'Europe/Madrid', rebuildHookUrl: null,
    acceptsBookings: true,
    lastPublishedAt: '2026-10-03T14:20:00Z',
    seo: {
      title: { es: 'Casabella — Cocina de barrio en El Raval', ca: 'Casabella — Cuina de barri al Raval', en: 'Casabella — Neighborhood cooking in El Raval' },
      description: { es: 'Tres décadas cocinando con producto de mercado en Sant Ramon del Call.' }
    }
  },
  {
    id: 'r-guixot',
    slug: 'guixot',
    name: 'Guixot',
    domain: 'guixot.cat',
    logoInitial: 'G',
    coverGradient: 'linear-gradient(135deg,#efe1cb,#1e3a5f)',
    state: 'published',
    activeLocales: ['es', 'ca', 'en'],
    defaultLocale: 'ca',
    completePercent: 100,
    spacesCount: 1,
    dishesCount: 28,
    winesCount: 22,
    address: { street: 'Passeig de Sant Joan 40', postalCode: '08010', city: 'Barcelona', district: 'Sant Andreu' },
    contact: { phone: '+34 933 45 67 89', email: 'hola@guixot.cat' },
    socials: { instagram: 'https://instagram.com/guixot' },
    showSocials: true, timezone: 'Europe/Madrid', rebuildHookUrl: null,
    acceptsBookings: true,
    lastPublishedAt: '2026-09-27T10:00:00Z',
    seo: {}
  },
  {
    id: 'r-la-principal',
    slug: 'la-principal',
    name: 'La Principal',
    domain: 'laprincipal.barcelona',
    logoInitial: 'L',
    coverGradient: 'linear-gradient(135deg,#cfc4ae,#6a6a6a)',
    state: 'draft',
    activeLocales: ['es', 'ca'],
    defaultLocale: 'ca',
    completePercent: 72,
    spacesCount: 2,
    dishesCount: 41,
    winesCount: 15,
    address: { street: 'Rambla de Catalunya 111', postalCode: '08008', city: 'Barcelona', district: 'Eixample' },
    contact: { phone: '+34 934 44 55 66' },
    socials: {},
    showSocials: false, timezone: 'Europe/Madrid', rebuildHookUrl: null,
    acceptsBookings: true,
    lastPublishedAt: '2026-09-24T09:00:00Z',
    seo: {}
  },
  {
    id: 'r-roure',
    slug: 'roure',
    name: 'Roure',
    domain: 'roure.eat',
    logoInitial: 'R',
    coverGradient: 'linear-gradient(135deg,#d5cdb8,#7a3a2a)',
    state: 'warnings',
    activeLocales: ['es', 'ca', 'en'],
    defaultLocale: 'es',
    completePercent: 84,
    spacesCount: 1,
    dishesCount: 18,
    winesCount: 12,
    address: { street: 'Carrer del Roure 7', postalCode: '08036', city: 'Barcelona', district: 'Sarrià' },
    contact: { phone: '+34 934 22 11 00', email: 'hola@roure.eat' },
    socials: { instagram: 'https://instagram.com/roure' },
    showSocials: true, timezone: 'Europe/Madrid', rebuildHookUrl: null,
    acceptsBookings: true,
    lastPublishedAt: '2026-09-24T20:00:00Z',
    seo: {}
  },
  {
    id: 'r-pubilla',
    slug: 'pubilla',
    name: 'Pubilla',
    domain: 'lapubilla.cat',
    logoInitial: 'P',
    coverGradient: 'linear-gradient(135deg,#e8ddc4,#b8935a)',
    state: 'published',
    activeLocales: ['es', 'ca'],
    defaultLocale: 'ca',
    completePercent: 88,
    spacesCount: 1,
    dishesCount: 24,
    winesCount: 0,
    address: { street: "Plaça de la Vila 3", postalCode: '08902', city: "L'Hospitalet de Llobregat" },
    contact: { phone: '+34 933 33 22 11' },
    socials: {},
    showSocials: false, timezone: 'Europe/Madrid', rebuildHookUrl: null,
    acceptsBookings: false,
    lastPublishedAt: '2026-09-21T12:00:00Z',
    seo: {}
  },
  {
    id: 'r-ocana',
    slug: 'ocana',
    name: 'Ocaña',
    domain: 'ocanabar.com',
    logoInitial: 'O',
    coverGradient: 'linear-gradient(135deg,#dbe0e8,#b4593b)',
    state: 'new',
    activeLocales: ['es', 'ca', 'en'],
    defaultLocale: 'es',
    completePercent: 35,
    spacesCount: 2,
    dishesCount: 8,
    winesCount: 3,
    address: { street: 'Plaça Reial 13', postalCode: '08002', city: 'Barcelona', district: 'Gòtic' },
    contact: { phone: '+34 933 78 90 12', email: 'hola@ocanabar.com' },
    socials: { instagram: 'https://instagram.com/ocanabar' },
    showSocials: true, timezone: 'Europe/Madrid', rebuildHookUrl: null,
    acceptsBookings: true,
    lastPublishedAt: '2026-09-27T00:00:00Z',
    seo: {}
  }
];

// ─────────────────────────────────────────────────────────────────
// Spaces
// ─────────────────────────────────────────────────────────────────
const EMPTY_SCHEDULE: Space['schedule'] = [
  { day: 'Mo', shifts: [] },
  { day: 'Tu', shifts: [] },
  { day: 'We', shifts: [{ open: '13:00', close: '16:00' }, { open: '20:00', close: '23:30' }] },
  { day: 'Th', shifts: [{ open: '13:00', close: '16:00' }, { open: '20:00', close: '23:30' }] },
  { day: 'Fr', shifts: [{ open: '13:00', close: '16:00' }, { open: '20:00', close: '23:30' }] },
  { day: 'Sa', shifts: [{ open: '13:00', close: '16:00' }, { open: '20:00', close: '23:30' }] },
  { day: 'Su', shifts: [{ open: '13:00', close: '16:00' }] }
];

export const SPACES: Space[] = [
  {
    id: 's-ocana-main', restaurantId: 'r-ocana', slug: 'comedor-principal',
    name: 'Comedor principal', type: 'restaurant', isDefault: true, order: 0,
    state: 'published', completePercent: 92,
    coverGradient: 'linear-gradient(135deg, var(--color-copper-400) 0%, var(--color-copper-600) 100%)',
    descriptor: 'interior · 1 turno · L–D',
    galleryCount: 18, dishesCount: 28, winesCount: 22,
    hero: {
      title: { es: 'Cocina de mercado,', ca: 'Cuina de mercat,', en: 'Market cooking,' },
      subtitle: { es: 'coctelería de autor', ca: "coctelería d'autor", en: 'signature cocktails' },
      metaLeft: { es: 'Desde 2019', ca: 'Des de 2019', en: 'Since 2019' },
      metaRight: { es: 'Plaça Reial · Barcelona', ca: 'Plaça Reial · Barcelona', en: 'Plaça Reial · Barcelona' },
      note: { es: 'Ambiente único en el corazón del Gòtic con carta que cambia cada semana según mercado.', ca: 'Ambient únic al cor del Gòtic amb carta que canvia cada setmana segons mercat.', en: 'Unique atmosphere in the heart of Gòtic with a menu changing weekly with the market.' },
      cta: { es: 'Reservar mesa', ca: 'Reservar taula', en: 'Book a table' },
      imageAlt: { es: 'Sala principal con lámparas de latón' }
    },
    manifesto: {
      eyebrow: { es: 'Nuestra cocina', ca: 'La nostra cuina', en: 'Our kitchen' },
      text: { es: 'Producto fresco, técnica y una carta que cambia con el mercado. Cada semana.' }
    },
    schedule: EMPTY_SCHEDULE,
    lastEditedAt: new Date().toISOString()
  },
  {
    id: 's-ocana-terrace', restaurantId: 'r-ocana', slug: 'terraza-verano',
    name: 'Terraza de verano', type: 'terraza', isDefault: false, order: 1,
    state: 'draft', completePercent: 48,
    coverGradient: 'linear-gradient(135deg, var(--color-copper-300) 0%, var(--color-copper-700) 100%)',
    descriptor: 'exterior · jun–sep · L–D',
    galleryCount: 6, dishesCount: 14, winesCount: 0,
    hero: {
      title: { es: 'Terraza bajo los porches', ca: 'Terrassa sota els porxos' },
      subtitle: { es: 'de la Plaça Reial' },
      metaLeft: { es: 'Solo verano' },
      metaRight: { es: 'Bar y aperitivos' },
      note: {},
      cta: { es: 'Ver disponibilidad' },
      imageAlt: {}
    },
    manifesto: { eyebrow: {}, text: {} },
    schedule: [],
    lastEditedAt: '2026-09-24T15:00:00Z'
  },
  { id: 's-casabella-main', restaurantId: 'r-casabella', slug: 'comedor-principal', name: 'Comedor principal', type: 'restaurant', isDefault: true, order: 0, state: 'published', completePercent: 96, coverGradient: 'var(--gradient-copper)', descriptor: 'interior · 2 turnos · L–S', galleryCount: 24, dishesCount: 32, winesCount: 18, hero: { title: { es: 'Cocina de barrio,' }, subtitle: { es: 'con acento del Raval' }, metaLeft: { es: 'Desde 1994' }, metaRight: { es: 'El Raval · Barcelona' }, note: {}, cta: { es: 'Reservar' }, imageAlt: {} }, manifesto: { eyebrow: {}, text: {} }, schedule: EMPTY_SCHEDULE, lastEditedAt: '2026-10-03T14:20:00Z' },
  { id: 's-guixot-main', restaurantId: 'r-guixot', slug: 'comedor', name: 'Comedor', type: 'restaurant', isDefault: true, order: 0, state: 'published', completePercent: 100, coverGradient: 'var(--gradient-copper)', descriptor: 'interior · 2 turnos · M–D', galleryCount: 22, dishesCount: 28, winesCount: 22, hero: { title: {}, subtitle: {}, metaLeft: {}, metaRight: {}, note: {}, cta: {}, imageAlt: {} }, manifesto: { eyebrow: {}, text: {} }, schedule: EMPTY_SCHEDULE, lastEditedAt: '2026-09-27T10:00:00Z' },
  { id: 's-la-principal-main', restaurantId: 'r-la-principal', slug: 'sala', name: 'Sala principal', type: 'restaurant', isDefault: true, order: 0, state: 'draft', completePercent: 72, coverGradient: 'var(--gradient-copper)', descriptor: 'interior · 2 turnos · L–D', galleryCount: 12, dishesCount: 41, winesCount: 15, hero: { title: {}, subtitle: {}, metaLeft: {}, metaRight: {}, note: {}, cta: {}, imageAlt: {} }, manifesto: { eyebrow: {}, text: {} }, schedule: EMPTY_SCHEDULE, lastEditedAt: '2026-09-24T09:00:00Z' },
  { id: 's-la-principal-private', restaurantId: 'r-la-principal', slug: 'privado', name: 'Comedor privado', type: 'restaurant', isDefault: false, order: 1, state: 'draft', completePercent: 40, coverGradient: 'linear-gradient(135deg, var(--color-copper-300) 0%, var(--color-copper-700) 100%)', descriptor: 'grupos · reserva mínima 8', galleryCount: 4, dishesCount: 0, winesCount: 0, hero: { title: {}, subtitle: {}, metaLeft: {}, metaRight: {}, note: {}, cta: {}, imageAlt: {} }, manifesto: { eyebrow: {}, text: {} }, schedule: [], lastEditedAt: '2026-09-20T18:00:00Z' },
  { id: 's-roure-main', restaurantId: 'r-roure', slug: 'sala', name: 'Sala', type: 'restaurant', isDefault: true, order: 0, state: 'warnings', completePercent: 84, coverGradient: 'var(--gradient-copper)', descriptor: 'interior · 1 turno · L–S', galleryCount: 14, dishesCount: 18, winesCount: 12, hero: { title: {}, subtitle: {}, metaLeft: {}, metaRight: {}, note: {}, cta: {}, imageAlt: {} }, manifesto: { eyebrow: {}, text: {} }, schedule: EMPTY_SCHEDULE, lastEditedAt: '2026-09-24T20:00:00Z' },
  { id: 's-pubilla-main', restaurantId: 'r-pubilla', slug: 'comedor', name: 'Comedor', type: 'restaurant', isDefault: true, order: 0, state: 'published', completePercent: 88, coverGradient: 'var(--gradient-copper)', descriptor: "interior · L'H · L–D", galleryCount: 16, dishesCount: 24, winesCount: 0, hero: { title: {}, subtitle: {}, metaLeft: {}, metaRight: {}, note: {}, cta: {}, imageAlt: {} }, manifesto: { eyebrow: {}, text: {} }, schedule: EMPTY_SCHEDULE, lastEditedAt: '2026-09-21T12:00:00Z' }
];

// ─────────────────────────────────────────────────────────────────
// Menu — solo unos platos por restaurante, suficiente para tabla
// ─────────────────────────────────────────────────────────────────
export const DISH_CATEGORIES: DishCategory[] = [
  { id: 'dc-1', spaceId: 's-casabella-main', name: { es: 'Entrantes' }, order: 1 },
  { id: 'dc-2', spaceId: 's-casabella-main', name: { es: 'Arroces' }, order: 2 },
  { id: 'dc-3', spaceId: 's-guixot-main', name: { es: 'Guisos' }, order: 1 },
  { id: 'dc-4', spaceId: 's-guixot-main', name: { es: 'Entrantes' }, order: 2 },
  { id: 'dc-5', spaceId: 's-la-principal-main', name: { es: 'Fondos' }, order: 1 },
  { id: 'dc-6', spaceId: 's-roure-main', name: { es: 'Postres' }, order: 1 }
];

export const DISHES: Dish[] = [
  { id: 'd-1', spaceId: 's-casabella-main', categoryId: 'dc-1', restaurantSlug: 'casabella', restaurantName: 'Casabella', categoryName: 'Entrantes', name: { es: 'Escalivada con anchoa', ca: 'Escalivada amb anxova', en: 'Escalivada with anchovy' }, note: {}, price: 14.5, order: 1, active: true, localesFilled: ['es', 'ca', 'en'], imageAssetId: null, imageGradient: 'linear-gradient(135deg,#b8935a,#7a3a2a)' },
  { id: 'd-2', spaceId: 's-guixot-main', categoryId: 'dc-3', restaurantSlug: 'guixot', restaurantName: 'Guixot', categoryName: 'Guisos', name: { es: 'Guiso de rabo de toro', ca: 'Guisat de cua de toro', en: 'Braised oxtail stew' }, note: {}, price: 22, order: 1, active: true, localesFilled: ['es', 'ca', 'en'], imageAssetId: null, imageGradient: 'linear-gradient(135deg,#cfc4ae,#7a3a2a)' },
  { id: 'd-3', spaceId: 's-casabella-main', categoryId: 'dc-2', restaurantSlug: 'casabella', restaurantName: 'Casabella', categoryName: 'Arroces', name: { es: 'Arroz de sepia y alcachofa', ca: 'Arròs de sípia i carxofa' }, note: {}, price: 19, order: 1, active: true, localesFilled: ['es', 'ca'], imageAssetId: null, imageGradient: 'linear-gradient(135deg,#dbe0e8,#1e3a5f)' },
  { id: 'd-4', spaceId: 's-guixot-main', categoryId: 'dc-4', restaurantSlug: 'guixot', restaurantName: 'Guixot', categoryName: 'Entrantes', name: { es: 'Tortilla trufada', ca: 'Truita trufada', en: 'Truffled omelette' }, note: {}, price: 16, order: 1, active: true, localesFilled: ['es', 'ca', 'en'], imageAssetId: null, imageGradient: 'linear-gradient(135deg,#efe1cb,#b8935a)' },
  { id: 'd-5', spaceId: 's-la-principal-main', categoryId: 'dc-5', restaurantSlug: 'la-principal', restaurantName: 'La Principal', categoryName: 'Fondos', name: { es: 'Canelones de festa major', ca: 'Canelons de festa major' }, note: {}, price: 18.5, order: 1, active: false, localesFilled: ['es', 'ca'], imageAssetId: null, imageGradient: 'linear-gradient(135deg,#e8ddc4,#6a6a6a)' },
  { id: 'd-6', spaceId: 's-roure-main', categoryId: 'dc-6', restaurantSlug: 'roure', restaurantName: 'Roure', categoryName: 'Postres', name: { es: 'Crema catalana quemada', ca: 'Crema catalana cremada', en: 'Torched crema catalana' }, note: {}, price: 7.5, order: 1, active: true, localesFilled: ['es', 'ca', 'en'], imageAssetId: null, imageGradient: 'linear-gradient(135deg,#d5cdb8,#7a3a2a)' }
];

export const WINE_CATEGORIES: WineCategory[] = [];
export const WINES: Wine[] = [];

// ─────────────────────────────────────────────────────────────────
// Languages
// ─────────────────────────────────────────────────────────────────
export const LANGUAGES: Language[] = [
  { id: 'lang-es', code: 'es', name: 'Español', usedByCount: 6 },
  { id: 'lang-ca', code: 'ca', name: 'Català', usedByCount: 6 },
  { id: 'lang-en', code: 'en', name: 'English', usedByCount: 4 },
  { id: 'lang-fr', code: 'fr', name: 'Français', usedByCount: 0 }
];

// ─────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────
export const USERS: User[] = [
  { id: 'u-erick', name: 'Erick Pineda', email: 'erick@hosteleria.cat', initials: 'EP', avatarColor: 'var(--color-copper-500)', role: 'admin', restaurants: ['*'], lastAccessRelative: 'ahora' },
  { id: 'u-marta', name: 'Marta Coll', email: 'marta@casabella.cat', initials: 'MC', avatarColor: 'var(--color-copper-700)', role: 'editor', restaurants: ['casabella', 'guixot'], lastAccessRelative: 'hace 4 h' }
];

// ─────────────────────────────────────────────────────────────────
// Media (14 placeholders con distintos gradients)
// ─────────────────────────────────────────────────────────────────
export const MEDIA: MediaAsset[] = [
  { id: 'm-1', name: 'hero-01', sizeKb: 420, restaurantSlug: 'casabella', usage: 'hero', hasAltText: true, gradient: 'linear-gradient(135deg,#b8935a,#7a3a2a)' },
  { id: 'm-2', name: 'sala-comedor', sizeKb: 380, restaurantSlug: 'casabella', usage: 'gallery', hasAltText: true, gradient: 'linear-gradient(135deg,#cfc4ae,#6a6a6a)' },
  { id: 'm-3', name: 'plato-arroz', sizeKb: 210, restaurantSlug: 'casabella', usage: 'dish', hasAltText: true, gradient: 'linear-gradient(135deg,#dbe0e8,#1e3a5f)' },
  { id: 'm-4', name: 'terraza-noche', sizeKb: 512, restaurantSlug: 'ocana', usage: 'gallery', hasAltText: false, gradient: 'linear-gradient(135deg,#d5cdb8,#7a3a2a)' },
  { id: 'm-5', name: 'equipo-cocina', sizeKb: 340, restaurantSlug: 'guixot', usage: 'gallery', hasAltText: true, gradient: 'linear-gradient(135deg,#efe1cb,#b8935a)' },
  { id: 'm-6', name: 'vino-blanco', sizeKb: 180, restaurantSlug: 'guixot', usage: 'gallery', hasAltText: false, gradient: 'linear-gradient(135deg,#e8ddc4,#6a6a6a)' },
  { id: 'm-7', name: 'postre-crema', sizeKb: 240, restaurantSlug: 'roure', usage: 'dish', hasAltText: true, gradient: 'linear-gradient(135deg,#b8935a,#7a3a2a)' },
  { id: 'm-8', name: 'hero-guixot', sizeKb: 460, restaurantSlug: 'guixot', usage: 'hero', hasAltText: true, gradient: 'linear-gradient(135deg,#efe1cb,#1e3a5f)' },
  { id: 'm-9', name: 'manifiesto-bg', sizeKb: 320, restaurantSlug: 'casabella', usage: 'gallery', hasAltText: false, gradient: 'linear-gradient(135deg,#cfc4ae,#7a3a2a)' },
  { id: 'm-10', name: 'logo-casabella', sizeKb: 28, restaurantSlug: 'casabella', usage: 'unused', hasAltText: true, gradient: 'linear-gradient(135deg,#b4593b,#2a1409)' },
  { id: 'm-11', name: 'galeria-01', sizeKb: 410, restaurantSlug: 'roure', usage: 'gallery', hasAltText: false, gradient: 'linear-gradient(135deg,#dbe0e8,#b4593b)' },
  { id: 'm-12', name: 'galeria-02', sizeKb: 390, restaurantSlug: 'roure', usage: 'gallery', hasAltText: true, gradient: 'linear-gradient(135deg,#e8ddc4,#8b6b3a)' },
  { id: 'm-13', name: 'galeria-03', sizeKb: 440, restaurantSlug: 'pubilla', usage: 'gallery', hasAltText: true, gradient: 'linear-gradient(135deg,#d5cdb8,#6a2f1e)' },
  { id: 'm-14', name: 'evento-boda', sizeKb: 560, restaurantSlug: 'pubilla', usage: 'gallery', hasAltText: true, gradient: 'linear-gradient(135deg,#b8935a,#4a2416)' }
];

// ─────────────────────────────────────────────────────────────────
// Pending tasks (derivadas del contenido, no de audit log)
// ─────────────────────────────────────────────────────────────────
export const PENDING_TASKS: PendingTask[] = [
  { id: 't-1', severity: 'critical', title: 'La Principal — 12 platos sin precio', body: 'Los platos sin precio se omiten del schema Menu de Google. Impacta al SEO de carta.', actionLabel: 'Ir a Carta', actionHref: '/dishes' },
  { id: 't-2', severity: 'critical', title: 'Ocaña — falta espacio principal', body: 'El schema requiere al menos un espacio con horarios para servir openingHoursSpecification.', actionLabel: 'Añadir espacio', actionHref: '/restaurants/ocana' },
  { id: 't-3', severity: 'warn', title: 'Roure — Manifiesto sin traducir en CA', body: 'Regla "todos los idiomas activos o ninguno" — o completas CA o vacías ES/EN.', actionLabel: 'Editar', actionHref: '/restaurants/roure' },
  { id: 't-4', severity: 'warn', title: 'Casabella — Hero nota sin EN', body: 'El campo heroNota está lleno en ES/CA pero vacío en EN.', actionLabel: 'Editar', actionHref: '/restaurants/casabella' },
  { id: 't-5', severity: 'warn', title: '8 imágenes sin alt text', body: 'Perjudica accesibilidad y ranking en Google Images. Reparto: Casabella 3 · Pubilla 2 · Roure 3.', actionLabel: 'Ir a Media', actionHref: '/media' },
  { id: 't-6', severity: 'warn', title: 'Pubilla — sin vinos', body: 'La sección de vinos aparece vacía en la landing. Añade categorías + vinos o oculta la sección.', actionLabel: 'Ir a Vinos', actionHref: '/dishes' }
];

// ─────────────────────────────────────────────────────────────────
// System status
// ─────────────────────────────────────────────────────────────────
export const SYSTEM_SERVICES: SystemService[] = [
  { id: 'svc-db', label: 'Base de datos · Neon', status: 'ok', meta: '42% · Free', detail: 'eu-central-1 · última consulta hace 3 s · 218 MB / 500 MB' },
  { id: 'svc-r2', label: 'Media · Cloudflare R2', status: 'ok', meta: '1.2 GB', detail: '312 archivos · CDN activo · zero egress' },
  { id: 'svc-api', label: 'API', status: 'ok', meta: 'v0.1.0', detail: 'api.hosteleria.cat · p95 47 ms · sin errores 24 h' }
];

export const REBUILDS: RebuildRow[] = [
  { id: 'rb-1', restaurant: 'Casabella', status: 'ok', relative: 'hace 4 h' },
  { id: 'rb-2', restaurant: 'Guixot', status: 'ok', relative: 'hace 6 h' },
  { id: 'rb-3', restaurant: 'La Principal', status: 'warn', relative: 'sin cambios' },
  { id: 'rb-4', restaurant: 'Roure', status: 'ok', relative: 'hace 3 d' }
];

// ─────────────────────────────────────────────────────────────────
// Helpers de acceso (mock — sustituir por fetch/server actions luego)
// ─────────────────────────────────────────────────────────────────
export function getRestaurantBySlug(slug: string): Restaurant | undefined {
  return RESTAURANTS.find(r => r.slug === slug);
}

export function getSpacesByRestaurantId(restaurantId: string): Space[] {
  return SPACES.filter(s => s.restaurantId === restaurantId).sort((a, b) => a.order - b.order);
}

export function getSpaceById(spaceId: string): Space | undefined {
  return SPACES.find(s => s.id === spaceId);
}
