import { createBuildInfoGET } from '@hosteleria/seo';
import { fetchContentVersion } from '../lib/queries';

export const prerender = true;
export const GET = createBuildInfoGET({ fetchContentVersion });
