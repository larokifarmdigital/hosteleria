import { createContentQueries } from '@hosteleria/content-client';
import { contentApiUrl } from './content';

const RESTAURANT_SLUG = import.meta.env.RESTAURANT_SLUG || 'ocana';

const content = createContentQueries({ apiUrl: contentApiUrl, slug: RESTAURANT_SLUG });

// Fetchers mono-espacio (compatibles con las 5 apps hermanas) — usados por
// site.webmanifest, robots y las páginas legales.
export const fetchRestaurantData = content.fetchRestaurantData;
export const fetchLegalPages = content.fetchLegalPages;
/** Versión del contenido con el que se construye la web (el `ETag` del api). */
export const fetchContentVersion = (): Promise<string | null> => content.fetchContentVersion();

// Fetchers multi-espacio (específicos de Ocaña — grupo con 3 espacios).
export const fetchGrupoData = content.fetchGrupoData;
export const fetchEspacioBySlug = content.fetchEspacioBySlug;
export const fetchEspacioMenu = content.fetchEspacioMenu;

export type {
  LocaleRef,
  Turno,
  DayHours,
  ContentImage,
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
} from '@hosteleria/content-client';
