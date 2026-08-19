import { createRobotsGET } from '@hosteleria/seo';
import { fetchRestaurantData } from '../lib/queries';

export const prerender = true;
export const GET = createRobotsGET({ fetchRestaurantData });
