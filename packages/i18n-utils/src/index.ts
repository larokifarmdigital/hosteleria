import {
  CODIGO_FALLBACK_GLOBAL,
  type CodigoIdioma,
} from '@hosteleria/sanity-schema/constants';

export { CODIGO_FALLBACK_GLOBAL };
export type { CodigoIdioma };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para leer campos i18n que vienen de Sanity vía sanity-plugin-internationalized-array
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estructura que devuelve el plugin sanity-plugin-internationalized-array para
 * cada campo i18n:
 *
 *   [
 *     { _key: 'es', _type: 'internationalizedArrayStringValue', value: 'Cocina de mercado' },
 *     { _key: 'en', _type: 'internationalizedArrayStringValue', value: 'Market cuisine' },
 *   ]
 */
export type EntradaI18nSanity = { _key: string; value?: string | null } | null | undefined;
export type CampoI18nSanity = EntradaI18nSanity[] | null | undefined;

export type VariablesInterpolacion = Record<string, string | number>;

/**
 * Devuelve el valor del locale pedido, con fallback al idiomaPorDefecto del restaurante
 * (y luego al CODIGO_FALLBACK_GLOBAL si sigue vacío). Retorna '' si no hay nada.
 *
 *   t(restaurante.heroTitulo, 'ca', 'es')  → catalán, o español, o el primer valor no vacío
 */
export function t(
  campo: CampoI18nSanity,
  locale: CodigoIdioma,
  localeDefecto: CodigoIdioma = CODIGO_FALLBACK_GLOBAL,
): string {
  if (!campo?.length) return '';
  const principal = campo.find((x) => x?._key === locale)?.value;
  if (principal) return principal;
  const fallback = campo.find((x) => x?._key === localeDefecto)?.value;
  if (fallback) return fallback;
  const fallbackGlobal = campo.find((x) => x?._key === CODIGO_FALLBACK_GLOBAL)?.value;
  if (fallbackGlobal) return fallbackGlobal;
  for (const item of campo) {
    if (item?.value) return item.value;
  }
  return '';
}

/**
 * Interpola placeholders `{clave}` en un string traducido.
 *   tp(dict.horariosAbierto, 'es', 'es', { hora: '23:30' })
 *     →  'Estamos abiertos hasta las 23:30.'
 */
export function tp(
  campo: CampoI18nSanity,
  locale: CodigoIdioma,
  localeDefecto: CodigoIdioma,
  vars: VariablesInterpolacion = {},
): string {
  return interpolar(t(campo, locale, localeDefecto), vars);
}

/**
 * Reemplaza `{clave}` en la plantilla con los valores del objeto `vars`.
 * Si una variable no está, deja el placeholder intacto (señal visible de que falta).
 */
export function interpolar(plantilla: string, vars?: VariablesInterpolacion): string {
  if (!vars) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (_match, clave: string) => {
    const valor = vars[clave];
    return valor === undefined || valor === null ? `{${clave}}` : String(valor);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de routing i18n
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ruta relativa respetando el locale activo. El locale por defecto NO prefija.
 *
 *   localizedPath('/', 'es', 'es')          → '/'
 *   localizedPath('/', 'ca', 'es')          → '/ca/'
 *   localizedPath('/carta', 'en', 'es')     → '/en/carta'
 */
export function localizedPath(
  ruta: string,
  locale: CodigoIdioma,
  localeDefecto: CodigoIdioma,
): string {
  const normalizada = ruta.startsWith('/') ? ruta : `/${ruta}`;
  if (locale === localeDefecto) return normalizada;
  if (normalizada === '/') return `/${locale}/`;
  return `/${locale}${normalizada}`;
}

/**
 * Devuelve la lista de locales que debe generar el sitio para un restaurante,
 * asegurando que el idiomaPorDefecto va primero y que no hay duplicados.
 *
 *   resolveActiveLocales('es', ['en', 'ca'])   → ['es', 'en', 'ca']
 *   resolveActiveLocales('es', ['es', 'ca'])   → ['es', 'ca']
 *   resolveActiveLocales('es', undefined)      → ['es']
 */
export function resolveActiveLocales(
  localeDefecto: CodigoIdioma,
  activos: CodigoIdioma[] | undefined,
): CodigoIdioma[] {
  const resto = (activos ?? []).filter((l) => l && l !== localeDefecto);
  return [localeDefecto, ...Array.from(new Set(resto))];
}
