/**
 * Secciones del editor de la web, en el orden en que el cliente las piensa:
 * primero su restaurante, luego la web de arriba abajo, al final lo avanzado.
 * La clave va en la URL (`?s=cover`) y no debe cambiar: los avisos de «Pendiente»
 * y las direcciones antiguas enlazan a ella.
 */
export type SectionKey =
  | 'overview' | 'hours' | 'contact' | 'languages'
  | 'cover' | 'home'
  | 'menu' | 'photos' | 'about' | 'groups' | 'faq'
  | 'media' | 'legal' | 'search' | 'spaces';

export interface SectionMeta {
  key: SectionKey;
  label: string;
  /** Una frase: qué es y dónde sale en la web. */
  hint: string;
  /** Se edita por espacio: con varios espacios, la sección lleva un selector. */
  perSpace?: boolean;
}

export const SECTIONS: SectionMeta[] = [
  { key: 'overview', label: 'Resumen', hint: 'Qué falta para que la web esté completa y en qué estado está.' },
  { key: 'hours', label: 'Horario', hint: 'Los días y las horas en que abre. Un día sin turnos sale como cerrado.', perSpace: true },
  { key: 'contact', label: 'Contacto y reservas', hint: 'Nombre, dirección, teléfono, redes y cómo se reserva.' },
  { key: 'languages', label: 'Idiomas de la web', hint: 'En qué idiomas se puede leer la web.' },
  { key: 'cover', label: 'Portada', hint: 'Lo primero que se ve al entrar en la web: título, foto, botón y el texto de presentación.', perSpace: true },
  { key: 'home', label: 'Bloques destacados', hint: 'Los bloques de la página de inicio que llevan a cada espacio.' },
  { key: 'menu', label: 'Carta', hint: 'Platos, vinos y bebidas. Cada cambio sale en la web sin publicar.', perSpace: true },
  { key: 'photos', label: 'Galería de fotos', hint: 'Las fotos de la galería, en el orden en que se ven.', perSpace: true },
  { key: 'about', label: 'Sobre nosotros', hint: 'La historia del restaurante, con sus fotos.' },
  { key: 'groups', label: 'Grupos y eventos', hint: 'Lo que ofrecéis a grupos y celebraciones. En la página de inicio va hacia el final, justo antes de las preguntas frecuentes.' },
  { key: 'faq', label: 'Preguntas frecuentes', hint: 'Respuestas a las dudas habituales. Google también puede mostrarlas.' },
  { key: 'media', label: 'Todas las fotos', hint: 'Subir fotos, describirlas y borrar las que ya no uses.' },
  { key: 'legal', label: 'Textos legales', hint: 'Aviso legal, privacidad y cookies. Salen en la web al guardarlos.' },
  { key: 'search', label: 'Google y buscadores', hint: 'Cómo aparece la web en Google, su icono y lo que leen los asistentes de IA.' },
  { key: 'spaces', label: 'Espacios', hint: 'Comedor, terraza, barra…: cada uno con su portada, horario y carta.' }
];

/** `folded`: lo que se toca de tarde en tarde va plegado en el menú, para que no compita con lo de cada semana. */
export const SECTION_GROUPS: { label: string; keys: SectionKey[]; folded?: boolean }[] = [
  { label: 'Tu restaurante', keys: ['overview', 'hours', 'contact', 'languages'] },
  { label: 'Tu web', keys: ['cover', 'home', 'menu', 'photos', 'about', 'groups', 'faq'] },
  { label: 'Avanzado', keys: ['media', 'legal', 'search', 'spaces'], folded: true }
];

export interface NavItem { key: SectionKey; /** Espacio que abre, en las secciones de espacio. */ e?: string }
export interface NavGroup { label: string; items: NavItem[]; folded?: boolean }

/** Lo que se edita de cada espacio, en el orden en que sale en su página. */
const SPACE_KEYS: SectionKey[] = ['cover', 'hours', 'menu', 'photos'];

/**
 * El menú. Con un solo espacio, «espacio» no aparece: sus secciones van con las
 * del restaurante. Con varios, cada espacio es un grupo con sus secciones, y
 * lo común (inicio, sobre nosotros…) va en «Página de inicio».
 */
export function navGroups(spaces: { id: string; name: string }[], visible: (key: SectionKey) => boolean): NavGroup[] {
  const items = (keys: SectionKey[], e?: string) => keys.filter(visible).map(key => ({ key, ...(e ? { e } : {}) }));
  if (spaces.length < 2) {
    return SECTION_GROUPS.map(g => ({ label: g.label, folded: g.folded, items: items(g.keys) }));
  }
  return [
    { label: 'Tu restaurante', items: items(['overview', 'contact', 'languages']) },
    { label: 'Página de inicio', items: items(['home', 'about', 'groups', 'faq']) },
    ...spaces.map(s => ({ label: s.name, items: items(SPACE_KEYS, s.id) })),
    { label: 'Avanzado', folded: true, items: items(['media', 'legal', 'search', 'spaces']) }
  ];
}

export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map(s => [s.key, s])) as Record<SectionKey, SectionMeta>;

/** Direcciones antiguas de la ficha (`?tab=`) y del espacio que siguen funcionando. */
const ALIAS: Record<string, SectionKey> = {
  data: 'contact', content: 'about', hours: 'hours', photos: 'photos', cover: 'cover',
  // El texto de presentación se edita ahora dentro de Portada.
  intro: 'cover',
  // El logo y los iconos son ahora un solo icono, en Google y buscadores.
  brand: 'search',
  // Los textos de la plantilla van ahora en la sección donde se ven.
  texts: 'contact'
};

export function sectionFromParam(value: string | null | undefined): SectionKey {
  if (!value) return 'overview';
  if (value in SECTION_BY_KEY) return value as SectionKey;
  return ALIAS[value] ?? 'overview';
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
  name: 'spaces', descriptor: 'spaces',
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
  if (section !== 'overview') query.set('s', section);
  for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value);
  const qs = query.toString();
  return `/restaurants/${slug}${qs ? `?${qs}` : ''}`;
}
