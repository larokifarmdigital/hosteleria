import type { MediaAsset } from '@hosteleria/api-client';

/** Restaurante al que pertenecen las fotos y los idiomas en los que hay que describirlas. */
export interface MediaScope {
  restaurantSlug: string;
  locales: string[];
  defaultLocale: string;
  localeNames: Record<string, string>;
}

/** Idiomas en los que la foto aún no tiene descripción. */
export function missingAltLocales(asset: MediaAsset, locales: string[]): string[] {
  return locales.filter(code => !asset.altText?.[code]?.trim());
}

/** Cómo nombrar la foto en la interfaz: su descripción si la tiene, y si no el nombre del archivo. */
export function mediaLabel(asset: MediaAsset, defaultLocale: string): string {
  return asset.altText?.[defaultLocale]?.trim() || asset.name;
}
