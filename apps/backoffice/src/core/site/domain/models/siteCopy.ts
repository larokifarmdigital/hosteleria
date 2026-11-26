import type { MediaAsset } from '@/core/media/domain';
import type { PublishedSiteSources } from './publishedSite';

/**
 * La copia publicada: las filas tal como estaban al pulsar «Publicar». Se guardan
 * las filas (también los platos ocultos y las categorías vacías), no la web ya
 * calculada, para poder comparar el borrador fila a fila y volver a crearlas al descartar.
 */
export interface SiteCopy extends PublishedSiteSources {
  /** Las fotos que salen en la web, con su descripción de entonces. */
  media: MediaAsset[];
}

/** En jsonb las fechas se guardan como texto: se vuelven a convertir los campos `…At`. */
export function reviveSiteCopy(json: unknown): SiteCopy {
  const walk = (value: unknown, key?: string): unknown => {
    if (Array.isArray(value)) return value.map(v => walk(v));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]));
    }
    if (typeof value === 'string' && key?.endsWith('At') && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value);
    return value;
  };
  return walk(json) as SiteCopy;
}
