// Textos fijos de la plantilla (menú, etiquetas del formulario, pie), traducidos
// aquí y no en el backoffice. Lo que el restaurante ya tenga guardado en el api
// gana; esto rellena los idiomas que falten.

type Dictionary = Record<string, Record<string, Partial<Record<string, string>>>>;

export const UI_TEXT_DEFAULTS: Dictionary = {
  nav: {
    place: { es: 'Historia', ca: 'Història', en: 'About', fr: 'Notre histoire', it: 'La nostra storia', de: 'Über uns', pt: 'A nossa história' },
    kitchen: { es: 'Carta', ca: 'Carta', en: 'Menu', fr: 'Carte', it: 'Menù', de: 'Speisekarte', pt: 'Menu' },
    wines: { es: 'Vinos', ca: 'Vins', en: 'Wines', fr: 'Vins', it: 'Vini', de: 'Weine', pt: 'Vinhos' },
    gallery: { es: 'Galería', ca: 'Galeria', en: 'Gallery', fr: 'Galerie', it: 'Galleria', de: 'Galerie', pt: 'Galeria' },
    book: { es: 'Reservar', ca: 'Reservar', en: 'Book', fr: 'Réserver', it: 'Prenota', de: 'Reservieren', pt: 'Reservar' }
  },
  form: {
    labelName: { es: 'Nombre', ca: 'Nom', en: 'Name', fr: 'Nom', it: 'Nome', de: 'Name', pt: 'Nome' },
    labelPhone: { es: 'Teléfono', ca: 'Telèfon', en: 'Phone', fr: 'Téléphone', it: 'Telefono', de: 'Telefon', pt: 'Telefone' },
    labelEmail: { es: 'Email', ca: 'Correu electrònic', en: 'Email', fr: 'E-mail', it: 'Email', de: 'E-Mail', pt: 'Email' },
    labelGuests: { es: 'Comensales', ca: 'Comensals', en: 'Guests', fr: 'Couverts', it: 'Persone', de: 'Personen', pt: 'Pessoas' },
    labelDate: { es: 'Fecha', ca: 'Data', en: 'Date', fr: 'Date', it: 'Data', de: 'Datum', pt: 'Data' },
    labelTime: { es: 'Hora', ca: 'Hora', en: 'Time', fr: 'Heure', it: 'Ora', de: 'Uhrzeit', pt: 'Hora' },
    labelNotes: {
      es: 'Notas (alergias, celebración…)', ca: 'Notes (al·lèrgies, celebració…)', en: 'Notes (allergies, celebration…)',
      fr: 'Remarques (allergies, célébration…)', it: 'Note (allergie, festeggiamenti…)', de: 'Hinweise (Allergien, Anlass…)', pt: 'Notas (alergias, celebração…)'
    },
    submit: { es: 'Enviar solicitud', ca: 'Enviar sol·licitud', en: 'Send request', fr: 'Envoyer la demande', it: 'Invia richiesta', de: 'Anfrage senden', pt: 'Enviar pedido' },
    success: {
      es: 'Abriendo tu cliente de correo para enviar la reserva…', ca: 'Obrint el teu client de correu per enviar la reserva…',
      en: 'Opening your email client to send the booking…', fr: 'Ouverture de votre messagerie pour envoyer la réservation…',
      it: 'Apertura del client di posta per inviare la prenotazione…', de: 'Ihr E-Mail-Programm wird geöffnet, um die Reservierung zu senden…',
      pt: 'A abrir o seu cliente de email para enviar a reserva…'
    }
  },
  footer: {
    contactColumn: { es: 'Contacto', ca: 'Contacte', en: 'Contact', fr: 'Contact', it: 'Contatti', de: 'Kontakt', pt: 'Contacto' }
  }
};

/** El valor guardado, con los idiomas que le falten rellenados con el texto fijo. */
export function withUiTextDefault(group: string, key: string, saved: Partial<Record<string, string>> | undefined, locales: string[]) {
  const fallback = UI_TEXT_DEFAULTS[group]?.[key];
  if (!fallback) return saved;
  const out: Partial<Record<string, string>> = {};
  for (const code of locales) if (fallback[code]) out[code] = fallback[code];
  for (const [code, value] of Object.entries(saved ?? {})) if (value?.trim()) out[code] = value;
  return out;
}
