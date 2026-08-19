/**
 * Utilidades para extraer datos del `mapaUrl` que el cliente pega desde Google Maps.
 * Soporta tanto el iframe completo como el src pelado.
 */

export function extractMapSrc(input: string | undefined): string {
  if (!input) return '';
  const match = input.match(/src=["']([^"']+)["']/i);
  return (match ? match[1] : input).trim();
}

/**
 * Los embed URL "share" de Google Maps traen 2 bloques de idioma al final del
 * parámetro `pb=`, con formato `!<N>m2!1s<lang>!2s<country>`. Reemplazando ese
 * `<lang>` sí se traduce el iframe (Google respeta esto, no el `hl=` sencillo).
 * Además añadimos `hl=` como refuerzo por si el URL no es formato pb.
 */
export function withMapLocale(src: string, loc: string): string {
  if (!src) return '';
  let out = src.replace(/(!1s)[a-z]{2,3}(!2s[a-z]{2,3})/gi, `$1${loc}$2`);
  out = /[?&]hl=/.test(out)
    ? out.replace(/([?&]hl=)[^&]*/, `$1${loc}`)
    : `${out}${out.includes('?') ? '&' : '?'}hl=${loc}`;
  return out;
}

/**
 * Extrae lat/lng del `pb=` de un iframe embed. Google los codifica como
 * `!2d<longitud>!3d<latitud>` (sí, primero longitud y luego latitud).
 */
export function extractCoords(src: string): { lat: number; lng: number } | null {
  if (!src) return null;
  const lng = src.match(/!2d(-?\d+\.?\d*)/);
  const lat = src.match(/!3d(-?\d+\.?\d*)/);
  if (!lng || !lat) return null;
  const la = parseFloat(lat[1]);
  const ln = parseFloat(lng[1]);
  if (isNaN(la) || isNaN(ln)) return null;
  return { lat: la, lng: ln };
}

/** Extrae el nombre del negocio del pb= (`!2s<Nombre%20Del%20Local>`). */
export function extractPlaceName(src: string): string {
  if (!src) return '';
  const match = src.match(/!1s0x[0-9a-f]+%3A0x[0-9a-f]+!2s([^!]+)/i);
  if (!match) return '';
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

/**
 * Extrae el FTID (Feature ID) del `pb=`. Formato `0x<featureType>:0x<CID>`.
 */
export function extractFTID(src: string): string {
  if (!src) return '';
  const m = src.match(/!1s(0x[0-9a-f]+(?:%3A|:)0x[0-9a-f]+)/i);
  return m ? decodeURIComponent(m[1]) : '';
}

/**
 * Convierte el FTID al CID decimal (Customer ID de Google Business).
 * El CID es la segunda parte del FTID (después de `:`) en hex. Se convierte
 * a decimal (necesita BigInt porque es 64-bit) y con eso Google Maps abre
 * EXACTAMENTE la ficha del negocio: `https://maps.google.com/?cid=<CID>`.
 * Es el mismo formato oficial que da "Compartir" en Google Business Profile.
 */
export function ftidToCID(ftid: string): string {
  if (!ftid) return '';
  const parts = ftid.split(':');
  if (parts.length !== 2) return '';
  try {
    return BigInt(parts[1]).toString(10);
  } catch {
    return '';
  }
}

/**
 * Construye el link externo "Ver en Google Maps" con prioridad:
 *  1. CID → https://maps.google.com/?cid=... abre la ficha EXACTA (formato oficial)
 *  2. Coordenadas → pin en las coordenadas exactas
 *  3. Dirección → búsqueda por texto (menos preciso)
 */
export function buildMapsExternalUrl(
  cid: string,
  coords: { lat: number; lng: number } | null,
  fullAddress: string,
  locale: string,
): string {
  if (cid) return `https://maps.google.com/?cid=${cid}&hl=${locale}`;
  if (coords) return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&hl=${locale}`;
  if (fullAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}&hl=${locale}`;
  }
  return '';
}
