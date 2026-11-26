import type { Restaurant } from './queries';
import {
  extractMapSrc,
  withMapLocale,
  extractCoords,
  extractFTID,
  ftidToCID,
  buildMapsExternalUrl
} from '@hosteleria/utils';

export function getLocation(restaurant: Restaurant, locale: string) {
  const dir = restaurant.direccion ?? {};
  const rawMapSrc = extractMapSrc(restaurant.mapaUrl);
  const fullAddress = [dir.calle, dir.codigoPostal, dir.ciudad, dir.pais].filter(Boolean).join(', ');

  const mapsUrl = rawMapSrc
    ? buildMapsExternalUrl(ftidToCID(extractFTID(rawMapSrc)), extractCoords(rawMapSrc), fullAddress, locale)
    : fullAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}&hl=${locale}`
      : '';

  return {
    dir,
    mapSrc: rawMapSrc ? withMapLocale(rawMapSrc, locale) : '',
    mapsUrl,
    area: [dir.barrio, dir.ciudad].filter(Boolean).join(' · ')
  };
}

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;
