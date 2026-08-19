import type { BookingStrings } from './index';

const STRINGS: Record<string, BookingStrings> = {
  es: {
    pickDate: 'Elegir fecha',
    pickTime: 'Elegir hora',
    prev: 'Anterior',
    next: 'Siguiente',
    closed: 'Cerrado',
    selectDateFirst: 'Elige primero la fecha',
    monthNames: [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ],
    dayShort: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    errPhone: 'Introduce un número español válido (ej: 612 345 678)',
    errEmail: 'Introduce un email válido',
    errGuests: 'Comensales: entre 1 y 20',
    errDate: 'Elige una fecha',
    errTime: 'Elige una hora'
  },
  en: {
    pickDate: 'Pick a date',
    pickTime: 'Pick a time',
    prev: 'Previous',
    next: 'Next',
    closed: 'Closed',
    selectDateFirst: 'Pick a date first',
    monthNames: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    dayShort: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    errPhone: 'Enter a valid Spanish number (e.g. 612 345 678)',
    errEmail: 'Enter a valid email',
    errGuests: 'Guests: between 1 and 20',
    errDate: 'Pick a date',
    errTime: 'Pick a time'
  },
  ca: {
    pickDate: 'Escollir data',
    pickTime: 'Escollir hora',
    prev: 'Anterior',
    next: 'Següent',
    closed: 'Tancat',
    selectDateFirst: 'Escull primer la data',
    monthNames: [
      'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
      'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
    ],
    dayShort: ['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'],
    errPhone: 'Introdueix un número espanyol vàlid (ex: 612 345 678)',
    errEmail: 'Introdueix un email vàlid',
    errGuests: 'Comensals: entre 1 i 20',
    errDate: 'Escull una data',
    errTime: 'Escull una hora'
  }
};

/** Devuelve los strings i18n del booking form. Fallback a español. */
export function bookingStrings(locale: string): BookingStrings {
  return STRINGS[locale] ?? STRINGS.es;
}
