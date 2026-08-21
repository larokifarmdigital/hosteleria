import { createManifestGET } from '@hosteleria/seo';
import { fetchRestaurantData } from '../lib/queries';
import { img } from '../lib/sanity';
import { accentColor } from '../lib/theme';

export const prerender = true;
export const GET = createManifestGET({ fetchRestaurantData, img, themeColor: accentColor });
