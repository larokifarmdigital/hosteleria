import { crearRestaurantQueries } from '@hosteleria/sanity-client';
import { sanity } from './sanity';

const RESTAURANT_SLUG = import.meta.env.RESTAURANT_SLUG || 'pubilla';

const queries = crearRestaurantQueries(sanity, RESTAURANT_SLUG);

export const fetchRestaurantData = queries.fetchRestaurantData;
export const fetchLegalPages = queries.fetchLegalPages;

export type {
  LocaleRef,
  Turno,
  DayHours,
  SanityImg,
  PortableBlock,
  I18nPortable,
  Restaurant,
  WineCategory,
  Wine,
  DishCategory,
  Dish,
  LegalPageDoc,
  RestaurantData
} from '@hosteleria/sanity-client';
