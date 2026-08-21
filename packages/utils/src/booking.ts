import { buildWhatsAppHref } from './whatsapp.ts';

export type BookingAction =
  | { kind: 'form'; href: string; external?: false; label?: undefined }
  | { kind: 'whatsapp'; href: string; external: true; label?: undefined }
  | { kind: 'tel'; href: string; external?: false; label: string }
  | null;

type BookingContact = {
  aceptaReservas?: boolean;
  contacto?: { whatsapp?: string; telefono?: string };
  nombre: string;
};

// Label localizado para el CTA cuando la acción es una llamada.
// UX: al mostrar "Llamar" el usuario sabe que va a abrirse el marcador,
// evitamos sorpresas de pulsar "Reservar" y que arranque una llamada.
const CALL_LABEL: Record<string, string> = {
  es: 'Llamar',
  en: 'Call',
  ca: 'Trucar'
};

/**
 * Resuelve la acción del botón "Reservar" según el estado del restaurante.
 *
 * Cascada:
 *   1. `aceptaReservas !== false` → mostrar formulario interno (#book)
 *   2. `aceptaReservas === false` + `contacto.whatsapp` → abrir WhatsApp
 *      (target `_blank`, mensaje corto prellenado por buildWhatsAppHref)
 *   3. `aceptaReservas === false` + `contacto.telefono` → llamada `tel:`
 *      (con label "Llamar" para que el usuario sepa qué va a pasar)
 *   4. Ninguno → devuelve `null` (el consumer NO renderiza el botón)
 *
 * `hrefPrefix` se usa desde páginas legales/404 para apuntar a `/#book`
 * en vez de `#book` (necesario cuando no estás en la home).
 */
export function resolveBookingAction(
  restaurant: BookingContact,
  locale: string,
  hrefPrefix: string = ''
): BookingAction {
  // Sanity: `aceptaReservas: false` = deshabilita form. Cualquier otro valor
  // (true, undefined, null) mantiene el comportamiento por defecto (formulario).
  if (restaurant.aceptaReservas !== false) {
    return { kind: 'form', href: `${hrefPrefix}#book` };
  }

  const wa = restaurant.contacto?.whatsapp?.trim();
  if (wa) {
    return {
      kind: 'whatsapp',
      href: buildWhatsAppHref(wa, restaurant.nombre, locale),
      external: true
    };
  }

  const tel = restaurant.contacto?.telefono?.trim();
  if (tel) {
    return {
      kind: 'tel',
      href: `tel:${tel.replace(/\s/g, '')}`,
      label: CALL_LABEL[locale] ?? CALL_LABEL.es
    };
  }

  return null;
}
