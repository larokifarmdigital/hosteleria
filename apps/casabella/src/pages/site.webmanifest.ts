import { createManifestGET } from '@hosteleria/seo';
import { fetchRestaurantData } from '../lib/queries';
import { img } from '../lib/sanity';

export const prerender = true;
export const GET = createManifestGET({ fetchRestaurantData, img });
