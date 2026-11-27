/**
 * Secciones del editor de la web, en el orden en que el cliente las piensa:
 * lo de cada semana arriba, luego la web de arriba abajo y al final la información.
 * La clave va en la URL (`?s=cover`) y no debe cambiar: los avisos de «Pendiente»
 * y las direcciones antiguas enlazan a ella.
 */
export type SectionKey =
  | 'hours' | 'contact' | 'languages'
  | 'cover' | 'home'
  | 'menu' | 'photos' | 'about' | 'groups' | 'faq'
  | 'media' | 'legal' | 'search' | 'spaces';

export interface SectionMeta {
  key: SectionKey;
  label: string;
  /** Una frase: qué es y dónde sale en la web. */
  hint: string;
  /** Se edita por espacio: con varios espacios, es una pestaña de la página del espacio. */
  perSpace?: boolean;
}

export const SECTIONS: SectionMeta[] = [
  { key: 'hours', label: 'Horario', hint: 'Los días y las horas en que abre. Un día sin turnos sale como cerrado.', perSpace: true },
  { key: 'contact', label: 'Contacto y reservas', hint: 'Nombre, dirección, teléfono, redes y cómo se reserva.' },
  { key: 'languages', label: 'Idiomas', hint: 'En qué idiomas se puede leer la web.' },
  { key: 'cover', label: 'Portada', hint: 'Lo primero que se ve al entrar en la web: título, foto, botón y el texto de presentación.', perSpace: true },
  { key: 'home', label: 'Tarjetas de los espacios', hint: 'Las tarjetas de la página de inicio que llevan a cada espacio.' },
  { key: 'menu', label: 'Carta', hint: 'Platos, vinos y bebidas. Los cambios se guardan solos y salen en tu web al pulsar «Publicar cambios».', perSpace: true },
  { key: 'photos', label: 'Galería', hint: 'Las fotos de la galería, en el orden en que se ven.', perSpace: true },
  { key: 'about', label: 'Sobre nosotros', hint: 'La historia del restaurante, con sus fotos.' },
  { key: 'groups', label: 'Grupos y celebraciones', hint: 'Comidas de grupo, celebraciones y empresas. En la página de inicio va hacia el final, justo antes de las preguntas frecuentes.' },
  { key: 'faq', label: 'Preguntas frecuentes', hint: 'Respuestas a las dudas habituales. Google también puede mostrarlas.' },
  // Fuera del menú: describir y borrar fotos se hace al elegirlas. Solo se llega desde el aviso de fotos en uso sin descripción.
  { key: 'media', label: 'Fotos sin descripción', hint: 'Fotos que ya salen en la web y no tienen descripción en todos los idiomas. La descripción es lo que oye quien no puede verlas.' },
  { key: 'legal', label: 'Textos legales', hint: 'Aviso legal, privacidad y cookies. Salen en tu web al pulsar «Publicar cambios».' },
  { key: 'search', label: 'Google y buscadores', hint: 'Cómo aparece la web en Google, su icono y lo que leen los asistentes de IA.' },
  { key: 'spaces', label: 'Espacios', hint: 'Comedor, terraza, barra…: cada uno con su portada, horario y carta.' }
];

/** Con un solo espacio: lo de cada semana, la web de arriba abajo y la información del local. */
export const SECTION_GROUPS: { label: string; keys: SectionKey[] }[] = [
  { label: 'Día a día', keys: ['menu', 'hours'] },
  { label: 'Páginas de la web', keys: ['cover', 'home', 'photos', 'about', 'groups', 'faq'] },
  { label: 'Datos del negocio', keys: ['contact', 'languages', 'search', 'legal', 'spaces'] }
];

/** Una entrada del menú: una sección suelta o una página de la web con sus partes en pestañas. */
export interface NavEntry {
  /** Estable: va en la key y en el desplegable móvil. */
  id: string;
  label: string;
  /** Sección que abre. */
  key: SectionKey;
  /** Espacio que abre, en la página de un espacio. */
  e?: string;
  /** Partes de la página, en pestañas. */
  tabs?: SectionKey[];
}
export interface NavGroup { label: string; entries: NavEntry[] }

const HOME_TABS: SectionKey[] = ['home', 'about', 'groups', 'faq'];
// El nombre del espacio no es una pestaña: se cambia con «Cambiar nombre», junto al título.
const SPACE_TABS: SectionKey[] = ['menu', 'hours', 'cover', 'photos'];
const BUSINESS_KEYS: SectionKey[] = ['contact', 'languages', 'search', 'legal', 'spaces'];

/**
 * El menú. Con un solo espacio, «espacio» no aparece: sus secciones van con las
 * del restaurante. Con varios, el menú copia cómo es la web: la página de inicio
 * y una página por espacio (cada una con sus partes en pestañas, siempre las
 * mismas), y aparte lo del negocio, que vale para toda la web y no lleva pestañas.
 */
export function editorNav(spaces: { id: string; name: string; type: string; isDefault: boolean }[], visible: (key: SectionKey) => boolean, current: SectionKey): NavGroup[] {
  const kind = localKindOf(spaces);
  const plain = (key: SectionKey): NavEntry => ({ id: key, label: sectionMeta(key, kind).label, key });
  if (spaces.length < 2) return SECTION_GROUPS.map(g => ({ label: g.label, entries: g.keys.filter(visible).map(plain) }));
  const homeTabs = HOME_TABS.filter(visible);
  // Al pasar de un espacio a otro se queda en la misma parte: de la carta de uno a la del otro.
  const spaceKey = SPACE_TABS.includes(current) ? current : 'menu';
  return [
    {
      label: 'Páginas de la web',
      entries: [
        { id: 'home', label: 'Página de inicio', key: homeTabs.includes(current) ? current : homeTabs[0], tabs: homeTabs },
        ...spaces.map(s => ({ id: `space-${s.id}`, label: s.name, key: spaceKey, e: s.id, tabs: SPACE_TABS }))
      ]
    },
    { label: 'Datos del negocio', entries: BUSINESS_KEYS.map(plain) }
  ];
}

export function isEntryActive(entry: NavEntry, section: SectionKey, spaceId: string | undefined): boolean {
  if (entry.tabs) return entry.tabs.includes(section) && (!entry.e || entry.e === spaceId);
  return entry.key === section;
}

export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map(s => [s.key, s])) as Record<SectionKey, SectionMeta>;

/**
 * Restaurante o bar: lo decide el tipo del espacio principal. Cambian el nombre de la
 * sección de grupos y sus ejemplos; los campos son los mismos.
 */
export type LocalKind = 'restaurant' | 'bar';
const BAR_TYPES = new Set(['cafe', 'coctel', 'club', 'live_music']);
export function localKindOf(spaces: { type: string; isDefault: boolean }[]): LocalKind {
  const main = spaces.find(s => s.isDefault) ?? spaces[0];
  return main && BAR_TYPES.has(main.type) ? 'bar' : 'restaurant';
}

const GROUPS_BY_KIND: Record<LocalKind, Pick<SectionMeta, 'label' | 'hint'>> = {
  restaurant: { label: 'Grupos y celebraciones', hint: 'Comidas de grupo, celebraciones y empresas. En la página de inicio va hacia el final, justo antes de las preguntas frecuentes.' },
  bar: { label: 'Eventos y fiestas privadas', hint: 'Cumpleaños, fiestas y zonas reservadas. En la página de inicio va hacia el final, justo antes de las preguntas frecuentes.' }
};

/** Nombre y ayuda de una sección para este local. */
export function sectionMeta(key: SectionKey, kind: LocalKind = 'restaurant'): SectionMeta {
  const meta = SECTION_BY_KEY[key];
  return key === 'groups' ? { ...meta, ...GROUPS_BY_KIND[kind] } : meta;
}

/** Direcciones antiguas de la ficha (`?tab=`) y del espacio que siguen funcionando. */
const ALIAS: Record<string, SectionKey> = {
  // «Resumen» ya no existe: lo que decía está en el estado de la web, arriba.
  overview: 'menu',
  data: 'contact', content: 'about', hours: 'hours', photos: 'photos', cover: 'cover',
  // El texto de presentación se edita ahora dentro de Portada.
  intro: 'cover',
  // El logo y los iconos son ahora un solo icono, en Google y buscadores.
  brand: 'search',
  // Los textos de la plantilla van ahora en la sección donde se ven.
  texts: 'contact',
  // La pestaña «Nombre» del espacio ya no existe: su nombre se cambia desde la cabecera.
  spacename: 'cover'
};

export function sectionFromParam(value: string | null | undefined): SectionKey {
  if (!value) return 'menu';
  if (value in SECTION_BY_KEY) return value as SectionKey;
  return ALIAS[value] ?? 'menu';
}

/** Sección en la que se edita cada campo de primer nivel de la ficha. */
const RESTAURANT_SECTION_OF: Record<string, SectionKey> = {
  name: 'contact', domain: 'contact', foundedYear: 'contact', address: 'contact', mapUrl: 'contact', contact: 'contact',
  socials: 'contact', showSocials: 'contact', acceptsBookings: 'contact',
  branding: 'search',
  about: 'about', groups: 'groups', faq: 'faq', homeBlocks: 'home',
  seo: 'search', business: 'search', aiSummary: 'search', analyticsToken: 'search'
};

/** Sección en la que se edita cada campo de primer nivel de un espacio. */
const SPACE_SECTION_OF: Record<string, SectionKey> = {
  name: 'cover', descriptor: 'cover',
  hero: 'cover', manifesto: 'cover', gallery: 'photos',
  schedule: 'hours', scheduleTexts: 'hours'
};

/** Los textos de la plantilla van cada uno donde se ven: títulos de carta, de galería, reserva y pie. */
function uiTextSectionOf(path: string): SectionKey {
  const [, group, key = ''] = path.split('.');
  if (group === 'sections') return key.startsWith('gallery') ? 'photos' : 'menu';
  return 'contact';
}

export const restaurantSectionOf = (path: string): SectionKey =>
  path.startsWith('uiTexts.') ? uiTextSectionOf(path) : RESTAURANT_SECTION_OF[path.split('.')[0]] ?? 'contact';
export const spaceSectionOf = (path: string): SectionKey => SPACE_SECTION_OF[path.split('.')[0]] ?? 'cover';

/** Dirección de una sección del editor. */
export function sectionHref(slug: string, section: SectionKey, extra: Record<string, string | undefined> = {}): string {
  const query = new URLSearchParams();
  if (section !== 'menu') query.set('s', section);
  for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value);
  const qs = query.toString();
  return `/restaurants/${slug}${qs ? `?${qs}` : ''}`;
}
