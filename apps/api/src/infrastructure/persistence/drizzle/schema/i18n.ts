import { jsonb, type AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Helpers para campos multiidioma en Drizzle.
 *
 * Un valor i18n en BD es un objeto `{ es?, ca?, en?, ... }` guardado como
 * `jsonb`. Si un locale no está definido, su key simplemente no aparece
 * (no se guarda `null` ni `""`).
 */

export type I18nValue = Record<string, string | undefined>;

/** Columna jsonb para strings cortos i18n (hero.title, name, etc.). */
export function i18nString(name: string): ReturnType<typeof jsonb> {
  return jsonb(name).$type<I18nValue>().default({});
}

/** Columna jsonb para textos largos i18n (manifesto, descripción, etc.).
 *  Mismo shape que `i18nString`; separado por legibilidad en el schema. */
export function i18nText(name: string): ReturnType<typeof jsonb> {
  return jsonb(name).$type<I18nValue>().default({});
}

/** `true` si el valor i18n tiene al menos un locale con contenido. */
export function i18nHasAny(value: I18nValue | null | undefined): boolean {
  if (!value) return false;
  return Object.values(value).some((v) => typeof v === 'string' && v.trim().length > 0);
}

/** Devuelve los codes ISO de los locales con contenido (ej. ['es', 'ca']). */
export function i18nLocalesFilled(value: I18nValue | null | undefined): string[] {
  if (!value) return [];
  return Object.entries(value)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
}

// Placeholder — evita warning de "unused import" sobre AnyPgColumn.
export type _Anchor = AnyPgColumn;
