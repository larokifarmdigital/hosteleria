/** Mensaje prellenado por locale para el link de WhatsApp. */
const WA_MSG_BY_LOCALE: Record<string, string> = {
  es: 'Hola, me gustaría reservar mesa en {nombre}',
  en: "Hi, I'd like to book a table at {nombre}",
  ca: 'Hola, m’agradaria reservar taula a {nombre}',
};

/**
 * Construye el href wa.me con mensaje traducido. Vacío si no hay número.
 * Sólo quedan dígitos del `whatsapp` (elimina espacios, +, guiones).
 */
export function buildWhatsAppHref(whatsappRaw: string, restaurantName: string, locale: string): string {
  const digits = whatsappRaw.replace(/\D/g, '');
  if (!digits) return '';
  const template = WA_MSG_BY_LOCALE[locale] ?? WA_MSG_BY_LOCALE.es;
  const message = template.replace('{nombre}', restaurantName);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
