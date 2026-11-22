import { crearRestaurantQueries } from '@hosteleria/sanity-client';
import { createContentQueries } from '@hosteleria/content-client';
import { contentApiUrl, sanity } from './sanity';

const RESTAURANT_SLUG = import.meta.env.RESTAURANT_SLUG || 'ocana';

const content = sanity ? null : createContentQueries({ apiUrl: contentApiUrl!, slug: RESTAURANT_SLUG });
const queries = content ?? crearRestaurantQueries(sanity!, RESTAURANT_SLUG);

// Fetchers mono-espacio (compatibles con las 5 apps hermanas) — usados por
// site.webmanifest, robots y las páginas legales.
export const fetchRestaurantData = queries.fetchRestaurantData;
export const fetchLegalPages = queries.fetchLegalPages;
/** Versión del contenido con el que se construye la web; `null` mientras se lea de Sanity. */
export const fetchContentVersion = async (): Promise<string | null> => (content ? content.fetchContentVersion() : null);

// Fetchers multi-espacio (específicos de Ocaña — grupo con 3 espacios).
export const fetchGrupoData = queries.fetchGrupoData;
export const fetchEspacioBySlug = queries.fetchEspacioBySlug;
export const fetchEspacioMenu = queries.fetchEspacioMenu;

export type {
  LocaleRef,
  Turno,
  DayHours,
  SanityImg,
  PortableBlock,
  I18nPortable,
  Restaurant,
  Espacio,
  WineCategory,
  Wine,
  DishCategory,
  Dish,
  DrinkCategory,
  Drink,
  BloqueHome,
  LegalPageDoc,
  RestaurantData,
  EspacioData,
  EspacioMenu,
  GrupoData
} from '@hosteleria/sanity-client';
