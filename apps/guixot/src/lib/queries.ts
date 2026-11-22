import { crearRestaurantQueries } from '@hosteleria/sanity-client';
import { createContentQueries } from '@hosteleria/content-client';
import { contentApiUrl, sanity } from './sanity';

const RESTAURANT_SLUG = import.meta.env.RESTAURANT_SLUG || 'guixot';

const content = sanity ? null : createContentQueries({ apiUrl: contentApiUrl!, slug: RESTAURANT_SLUG });
const queries = content ?? crearRestaurantQueries(sanity!, RESTAURANT_SLUG);

export const fetchRestaurantData = queries.fetchRestaurantData;
export const fetchLegalPages = queries.fetchLegalPages;
/** Versión del contenido con el que se construye la web; `null` mientras se lea de Sanity. */
export const fetchContentVersion = async (): Promise<string | null> => (content ? content.fetchContentVersion() : null);

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
  LegalPageDoc,
  RestaurantData
} from '@hosteleria/sanity-client';
