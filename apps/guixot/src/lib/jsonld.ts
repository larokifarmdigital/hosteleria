import { t, type CodigoIdioma } from '@hosteleria/i18n-utils';
import type { Restaurant } from './queries';
import { img } from './sanity';

/**
 * Extrae las coordenadas del `pb=` de un embed URL de Google Maps.
 * Formato: `!2d<longitud>!3d<latitud>`. Devuelve null si no se pueden extraer.
 */
function extraerCoordsDeMapaUrl(mapaUrl: string | undefined): { lat: number; lng: number } | null {
  if (!mapaUrl) return null;
  // Si es un iframe completo, extraer el src
  const srcMatch = mapaUrl.match(/src=["']([^"']+)["']/i);
  const src = srcMatch ? srcMatch[1] : mapaUrl;
  const lngMatch = src.match(/!2d(-?\d+\.?\d*)/);
  const latMatch = src.match(/!3d(-?\d+\.?\d*)/);
  if (!lngMatch || !latMatch) return null;
  const lat = parseFloat(latMatch[1]);
  const lng = parseFloat(lngMatch[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

const DIA_SCHEMA: Record<string, string> = {
  Su: 'Sunday',
  Mo: 'Monday',
  Tu: 'Tuesday',
  We: 'Wednesday',
  Th: 'Thursday',
  Fr: 'Friday',
  Sa: 'Saturday',
};

const PAGO_SCHEMA: Record<string, string> = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  contactless: 'Contactless',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  bizum: 'Bizum',
};

/**
 * Construye el JSON-LD `Restaurant` enriquecido (schema.org) que leen tanto los
 * buscadores clásicos (Google Rich Results) como los LLMs (Perplexity, ChatGPT).
 * Solo incluye campos con valor — nada de nulls / undefined dentro del JSON.
 */
export function buildRestaurantJsonLd(
  restaurant: Restaurant,
  locale: CodigoIdioma,
  defaultLocale: CodigoIdioma,
  canonical: string,
) {
  const dir = restaurant.direccion ?? {};
  const contacto = restaurant.contacto ?? {};
  const logoUrl = img.url(restaurant.logo);
  const heroImageUrl = img.url(restaurant.heroImagen);
  const seoImageUrl = img.url(restaurant.seoImagen);
  const images = [heroImageUrl, seoImageUrl].filter((u): u is string => Boolean(u));

  const openingHours = (restaurant.horariosSemana ?? []).flatMap((dia) => {
    const dayName = DIA_SCHEMA[dia.dia];
    if (!dayName || !dia.turnos?.length) return [];
    return dia.turnos.map((tu) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: dayName,
      opens: tu.apertura,
      closes: tu.cierre === '24:00' ? '23:59' : tu.cierre,
    }));
  });

  const paymentAccepted = (restaurant.formasPago ?? [])
    .map((p) => PAGO_SCHEMA[p])
    .filter(Boolean)
    .join(', ');

  // Solo publicamos las RRSS en JSON-LD (schema.org sameAs) si el cliente lo activó
  // en Sanity. Los datos siguen guardados aunque el flag esté a false.
  const sameAs = restaurant.mostrarRedes
    ? [
        restaurant.redes?.instagram,
        restaurant.redes?.facebook,
        restaurant.redes?.tiktok,
      ].filter(Boolean)
    : [];

  const description =
    t(restaurant.resumenIA, locale, defaultLocale) ||
    t(restaurant.seoDescripcion, locale, defaultLocale) ||
    undefined;

  const priceFromMedio = restaurant.precioMedio
    ? '€'.repeat(Math.max(1, Math.min(4, Math.ceil(restaurant.precioMedio / 20))))
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${canonical}#restaurant`,
    name: restaurant.nombre,
    ...(description && { description }),
    url: canonical,
    ...(logoUrl && { logo: logoUrl }),
    ...(images.length && { image: images }),
    ...(priceFromMedio && { priceRange: priceFromMedio }),
    servesCuisine: ['Mediterránea', 'Contemporánea', 'Catalana', 'Italiana'],
    ...(restaurant.aceptaReservas != null && {
      acceptsReservations: restaurant.aceptaReservas,
    }),
    ...(paymentAccepted && { paymentAccepted }),
    smokingAllowed: false,
    address: {
      '@type': 'PostalAddress',
      ...(dir.calle && { streetAddress: dir.calle }),
      ...(dir.ciudad && { addressLocality: dir.ciudad }),
      ...(dir.provincia && { addressRegion: dir.provincia }),
      ...(dir.codigoPostal && { postalCode: dir.codigoPostal }),
      ...(dir.pais && { addressCountry: dir.pais }),
    },
    ...((() => {
      // Coordenadas para JSON-LD: extraídas automáticamente del `mapaUrl` embed.
      const geo = extraerCoordsDeMapaUrl(restaurant.mapaUrl);
      return geo
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: geo.lat,
              longitude: geo.lng,
            },
          }
        : {};
    })()),
    ...(contacto.telefono && { telephone: contacto.telefono }),
    ...(contacto.email && { email: contacto.email }),
    ...(openingHours.length && { openingHoursSpecification: openingHours }),
    ...(sameAs.length && { sameAs }),
    ...(restaurant.mapaUrl && { hasMap: restaurant.mapaUrl }),
    ...(restaurant.precioMedio && {
      amenityFeature: (restaurant.serviciosExtras ?? []).map((s) => ({
        '@type': 'LocationFeatureSpecification',
        name: s.replace(/_/g, ' '),
        value: true,
      })),
    }),
  };
}

/**
 * FAQPage JSON-LD — permite que Google AI Overviews, Perplexity y ChatGPT
 * extraigan las preguntas/respuestas y las citen directamente.
 */
export function buildFaqJsonLd(
  faq: Restaurant['faq'],
  locale: CodigoIdioma,
  defaultLocale: CodigoIdioma,
) {
  if (!faq?.length) return null;
  const entries = faq
    .map((item) => {
      const pregunta = t(item.pregunta, locale, defaultLocale);
      const respuesta = t(item.respuesta, locale, defaultLocale);
      if (!pregunta || !respuesta) return null;
      return {
        '@type': 'Question',
        name: pregunta,
        acceptedAnswer: {
          '@type': 'Answer',
          text: respuesta,
        },
      };
    })
    .filter(Boolean);
  if (!entries.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries,
  };
}
