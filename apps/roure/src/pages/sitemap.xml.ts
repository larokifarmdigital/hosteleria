import { createSitemapGET } from '@hosteleria/seo';
import { fetchRestaurantData, fetchLegalPages } from '../lib/queries';

export const prerender = true;
export const GET = createSitemapGET({ fetchRestaurantData, fetchLegalPages });
