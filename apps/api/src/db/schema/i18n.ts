import { jsonb, type AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Un valor i18n en la BD es un objeto `{ es?, ca?, en?, ... }` guardado
 * como jsonb. Los helpers `i18nString` / `i18nText` existen solo por
 * legibilidad — Postgres no distingue tipos en jsonb.
 *
 * Convención: si un campo no está definido para un locale, ese locale
 * simplemente no aparece en el objeto (no se guarda `null` o `""`).
 */
export type I18nValue = Record<string, string | undefined>;

export function i18nString(name: string): ReturnType<typeof jsonb> {
  return jsonb(name).$type<I18nValue>().default({});
}

export function i18nText(name: string): ReturnType<typeof jsonb> {
  return jsonb(name).$type<I18nValue>().default({});
}

// Utilidad: comprueba si un i18n tiene al menos un locale relleno.
export function i18nHasAny(value: I18nValue | null | undefined): boolean {
  if (!value) return false;
  return Object.values(value).some((v) => typeof v === 'string' && v.trim().length > 0);
}

// Utilidad: lista los locale codes rellenos.
export function i18nLocalesFilled(value: I18nValue | null | undefined): string[] {
  if (!value) return [];
  return Object.entries(value)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
}

// Placeholder para que el import de AnyPgColumn no genere warning de unused.
export type _Anchor = AnyPgColumn;
