import { crearRestaurantQueries } from '@hosteleria/sanity-client';
import { sanity } from './sanity';

const RESTAURANT_SLUG = import.meta.env.RESTAURANT_SLUG || 'ocana';

const queries = crearRestaurantQueries(sanity, RESTAURANT_SLUG);

// Fetchers mono-espacio (compatibles con las 5 apps hermanas) — usados por
// site.webmanifest, robots y las páginas legales.
export const fetchRestaurantData = queries.fetchRestaurantData;
export const fetchLegalPages = queries.fetchLegalPages;

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
