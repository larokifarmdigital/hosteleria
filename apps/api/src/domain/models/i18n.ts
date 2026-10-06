/**
 * Valor multi-idioma del dominio.
 *
 * Shape: `{ es?: '...', ca?: '...', en?: '...' }`. Si un locale no está
 * rellenado, su key simplemente no aparece — nunca `null` ni `""`.
 */
export type I18nValue = Partial<Record<string, string>>;

/** `true` si al menos un locale tiene contenido. */
export function i18nHasAny(value: I18nValue | null | undefined): boolean {
  if (!value) return false;
  return Object.values(value).some(v => typeof v === 'string' && v.trim().length > 0);
}

/** Codes ISO de los locales con contenido (ej. `['es', 'ca']`). */
export function i18nLocalesFilled(value: I18nValue | null | undefined): string[] {
  if (!value) return [];
  return Object.entries(value)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
}
