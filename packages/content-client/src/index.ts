// Contenido de una landing leído del api propio (`GET /public/restaurants/:slug`),
// con la misma forma y las mismas funciones que `@hosteleria/sanity-client`.
import type { PublishedSite } from '@hosteleria/api-client';
import type { ImageBuilder, LegalPageDoc, RestaurantData } from '@hosteleria/sanity-client';
import { toLegalPages, toRestaurantData, toSpaceMenu } from './fromApi';

export * from './fromApi';
export { markdownToBlocks } from './markdown';

export interface ContentClientOpts {
  /** Base del api, sin barra final: `https://api.ejemplo.com`. */
  apiUrl: string;
  slug: string;
  fetch?: typeof fetch;
}

export interface ContentQueries {
  fetchRestaurantData(): Promise<RestaurantData>;
  /** El argumento se ignora: existe para que la firma sea la de Sanity. */
  fetchLegalPages(restaurantId?: string): Promise<LegalPageDoc[]>;
  fetchEspacioMenu(espacioId: string): Promise<ReturnType<typeof toSpaceMenu>>;
  /** La respuesta del api tal cual. */
  fetchSite(): Promise<PublishedSite>;
}

export function createContentQueries({ apiUrl, slug, fetch: fetchImpl = fetch }: ContentClientOpts): ContentQueries {
  // Una sola petición por build: todas las páginas comparten la respuesta.
  let site: Promise<PublishedSite> | null = null;
  const fetchSite = () => {
    site ??= (async () => {
      const url = `${apiUrl.replace(/\/$/, '')}/public/restaurants/${slug}`;
      const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
      if (res.status === 404) {
        throw new Error(`El restaurante «${slug}» no existe en el api o no se ha publicado nunca (${url}). Publícalo desde el backoffice.`);
      }
      if (!res.ok) throw new Error(`El api respondió ${res.status} al pedir ${url}.`);
      const body = await res.json() as PublishedSite;
      if (body.spaces.length === 0) {
        throw new Error(`El restaurante «${slug}» no tiene ningún espacio publicado. Publica al menos uno desde el backoffice.`);
      }
      return body;
    })();
    return site;
  };

  return {
    fetchSite,
    fetchRestaurantData: async () => toRestaurantData(await fetchSite()),
    fetchLegalPages: async () => toLegalPages(await fetchSite()),
    fetchEspacioMenu: async (espacioId) => toSpaceMenu(await fetchSite(), espacioId)
  };
}

type ImageSource = { asset?: { url?: string } } | null | undefined;

/**
 * Las fotos del api ya salen optimizadas del backoffice (2400 px, WebP) y R2 no
 * las transforma: las tres funciones devuelven la misma URL. El icono de la app
 * tiene que subirse ya cuadrado.
 */
export function createImageBuilder(): ImageBuilder {
  const url = (source: unknown) => (source as ImageSource)?.asset?.url || undefined;
  return { url, width: url, pngSquare: url };
}
