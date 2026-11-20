export type I18nValues = Record<string, string>;

/** Un campo de formulario por idioma activo, vacío si no hay texto. */
export function i18nToForm(value: Record<string, string | undefined> | undefined, locales: string[]): I18nValues {
  return Object.fromEntries(locales.map(code => [code, value?.[code] ?? '']));
}

/**
 * Vuelve al formato del api: un idioma sin texto no lleva key (nunca `""`).
 * Parte del valor original para no perder idiomas que ya no están activos.
 */
export function i18nFromForm(
  original: Record<string, string | undefined> | undefined,
  form: I18nValues
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [code, text] of Object.entries(original ?? {})) {
    if (text) out[code] = text;
  }
  for (const [code, text] of Object.entries(form)) {
    const trimmed = text.trim();
    if (trimmed) out[code] = trimmed;
    else delete out[code];
  }
  return out;
}

/** Quita las claves vacías de un objeto de strings (dirección, contacto, redes). */
export function compact<T extends Record<string, string>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== '')
  ) as Partial<T>;
}

/** Comparación estable: ignora el orden de las claves y los valores vacíos. */
export function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined;
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, normalize(v)] as const)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
}
