import { createContentQueries } from '@hosteleria/content-client';
import { contentApiUrl } from './content';

const RESTAURANT_SLUG = import.meta.env.RESTAURANT_SLUG || 'la-principal';

const content = createContentQueries({ apiUrl: contentApiUrl, slug: RESTAURANT_SLUG });

export const fetchRestaurantData = content.fetchRestaurantData;
export const fetchLegalPages = content.fetchLegalPages;
/** Versión del contenido con el que se construye la web (el `ETag` del api). */
export const fetchContentVersion = (): Promise<string | null> => content.fetchContentVersion();

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
  LegalPageDoc,
  RestaurantData
} from '@hosteleria/content-client';
