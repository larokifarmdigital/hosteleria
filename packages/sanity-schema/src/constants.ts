/**
 * Los idiomas se gestionan como documentos `idioma` en Sanity — no viven en código.
 * Aquí solo mantenemos el CÓDIGO usado como último fallback cuando el helper `t()`
 * no encuentra ni el locale pedido ni el defaultLocale del restaurante.
 * Debe existir siempre como un doc `idioma` en Sanity.
 */
export const CODIGO_FALLBACK_GLOBAL = 'es';

/** Tipo genérico. Los códigos reales vienen del CMS en runtime. */
export type CodigoIdioma = string;
