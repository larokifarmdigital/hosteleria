/** Campo traducible de un formulario, con el nombre que ve el editor. */
export interface TranslatableField {
  /** Ruta del objeto i18n en el formulario, p. ej. `hero.title`. */
  name: string;
  label: string;
  section: string;
}

export interface TranslationGap {
  field: TranslatableField;
  /** Idiomas activos en los que falta el texto. */
  locales: string[];
}

type I18nText = Record<string, string | undefined> | null | undefined;

/**
 * Regla del proyecto: un texto va en todos los idiomas activos o en ninguno.
 * Devuelve los idiomas que faltan; vacío si está en todos o no está en ninguno.
 */
export function missingLocales(value: I18nText, locales: string[]): string[] {
  const missing = locales.filter(code => !value?.[code]?.trim());
  return missing.length === locales.length ? [] : missing;
}

export function translationGaps(fields: TranslatableField[], values: unknown, locales: string[]): TranslationGap[] {
  return fields
    .map(field => ({ field, locales: missingLocales(valueAt(values, field.name), locales) }))
    .filter(gap => gap.locales.length > 0);
}

/** Nº de textos que faltan en cada idioma, para marcar el selector de idioma. */
export function gapsByLocale(gaps: TranslationGap[]): Record<string, number> {
  const out: Record<string, number> = {};
  gaps.forEach(gap => gap.locales.forEach(code => { out[code] = (out[code] ?? 0) + 1; }));
  return out;
}

/** «catalán», «catalán e inglés», «catalán, inglés y francés». */
export function localeList(codes: string[], names: Record<string, string>): string {
  const labels = codes.map(code => (names[code] ?? code.toUpperCase()).toLowerCase());
  if (labels.length <= 1) return labels[0] ?? '';
  const last = labels[labels.length - 1];
  return `${labels.slice(0, -1).join(', ')} ${/^(i|hi)/.test(last) ? 'e' : 'y'} ${last}`;
}

function valueAt(values: unknown, path: string): I18nText {
  return path.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), values) as I18nText;
}
