import { DomainError } from './errors';

/**
 * `{ es?: '...', ca?: '...', en?: '...' }`. Si un locale está vacío,
 * su key no aparece — nunca `null` ni `""`.
 */
export type I18nValue = Partial<Record<string, string>>;

export function i18nHasAny(value: I18nValue | null | undefined): boolean {
  if (!value) return false;
  return Object.values(value).some(v => typeof v === 'string' && v.trim().length > 0);
}

export function i18nLocalesFilled(value: I18nValue | null | undefined): string[] {
  if (!value) return [];
  return Object.entries(value)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([code]) => code);
}

/**
 * Regla de publicación: un texto va en todos los idiomas activos o en ninguno.
 * Devuelve los idiomas que faltan; vacío si está en todos o en ninguno.
 */
export function i18nMissingLocales(value: I18nValue | null | undefined, activeLocales: string[]): string[] {
  const filled = i18nLocalesFilled(value);
  const missing = activeLocales.filter(code => !filled.includes(code));
  return missing.length === activeLocales.length ? [] : missing;
}

/** Se intenta publicar con textos traducidos solo a parte de los idiomas activos. */
export class TranslationsIncompleteError extends DomainError {
  readonly code = 'TRANSLATIONS_INCOMPLETE';
  readonly status = 400;
  readonly fields: string[];
  constructor(fields: string[]) {
    super(`No se puede publicar: ${fields.length === 1 ? 'falta traducir 1 texto' : `faltan por traducir ${fields.length} textos`} (${fields.join(', ')}).`);
    this.name = 'TranslationsIncompleteError';
    this.fields = fields;
  }
}

/** Lanza si alguno de los textos está a medio traducir. `texts`: nombre visible → valor. */
export function assertTranslationsComplete(texts: Record<string, I18nValue | null | undefined>, activeLocales: string[]): void {
  const incomplete = Object.entries(texts)
    .filter(([, value]) => i18nMissingLocales(value, activeLocales).length > 0)
    .map(([label]) => label);
  if (incomplete.length > 0) throw new TranslationsIncompleteError(incomplete);
}
