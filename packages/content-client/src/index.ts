// Contenido de una landing leído del api propio (`GET /public/restaurants/:slug`),
// con la misma forma y las mismas funciones que `@hosteleria/sanity-client`.
import type { PublishedSite } from '@hosteleria/api-client';
import type { EspacioData, EspacioMenu, GrupoData, ImageBuilder, LegalPageDoc, RestaurantData } from '@hosteleria/sanity-client';
import { toGroupData, toLegalPages, toRestaurantData, toSpaceData, toSpaceMenu } from './fromApi';

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
  fetchEspacioMenu(espacioId: string): Promise<EspacioMenu>;
  /** Ficha y espacios, sin cartas: para la portada de un grupo. */
  fetchGrupoData(): Promise<GrupoData>;
  fetchEspacioBySlug(espacioSlug: string): Promise<EspacioData>;
  /** La respuesta del api tal cual. */
  fetchSite(): Promise<PublishedSite>;
  /** Versión del contenido con el que se construye la web (el `ETag` del api). */
  fetchContentVersion(): Promise<string | null>;
}

export function createContentQueries({ apiUrl, slug, fetch: fetchImpl = fetch }: ContentClientOpts): ContentQueries {
  // Una sola petición por build: todas las páginas comparten la respuesta.
  let site: Promise<PublishedSite> | null = null;
  let version: string | null = null;
  const fetchSite = () => {
    site ??= (async () => {
      const url = `${apiUrl.replace(/\/$/, '')}/public/restaurants/${slug}`;
      const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
      if (res.status === 404) {
        throw new Error(`El restaurante «${slug}» no existe en el api o no se ha publicado nunca (${url}). Publícalo desde el backoffice.`);
      }
      if (!res.ok) throw new Error(`El api respondió ${res.status} al pedir ${url}.`);
      // `W/"abc"` o `"abc"` → `abc`.
      version = res.headers.get('etag')?.replace(/^W\//, '').replace(/"/g, '') ?? null;
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
    fetchContentVersion: async () => { await fetchSite(); return version; },
    fetchRestaurantData: async () => toRestaurantData(await fetchSite()),
    fetchLegalPages: async () => toLegalPages(await fetchSite()),
    fetchEspacioMenu: async (espacioId) => toSpaceMenu(await fetchSite(), espacioId),
    fetchGrupoData: async () => toGroupData(await fetchSite()),
    fetchEspacioBySlug: async (espacioSlug) => {
      const site = await fetchSite();
      const data = toSpaceData(site, espacioSlug);
      if (!data) {
        throw new Error(`El espacio «${espacioSlug}» de «${slug}» no existe o no está publicado. Publicados: ${site.spaces.map(s => s.slug).join(', ')}`);
      }
      return data;
    }
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
