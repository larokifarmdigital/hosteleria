import { jsonb } from 'drizzle-orm/pg-core';

// jsonb `{ es?, ca?, en?, ... }`: un locale sin contenido no tiene key
// (nunca `null` ni `""`).

export type I18nValue = Record<string, string | undefined>;

export function i18nString(name: string): ReturnType<typeof jsonb> {
  return jsonb(name).$type<I18nValue>().default({});
}

/** Mismo shape que `i18nString`; separado por legibilidad en el schema. */
export function i18nText(name: string): ReturnType<typeof jsonb> {
  return jsonb(name).$type<I18nValue>().default({});
}

export function i18nHasAny(value: I18nValue | null | undefined): boolean {
  if (!value) return false;
  return Object.values(value).some((v) => typeof v === 'string' && v.trim().length > 0);
}

export function i18nLocalesFilled(value: I18nValue | null | undefined): string[] {
  if (!value) return [];
  return Object.entries(value)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
}
