import { idioma } from './documents/idioma';
import { restaurante } from './documents/restaurante';
import { categoriaVino } from './documents/categoriaVino';
import { vino } from './documents/vino';
import { categoriaPlato } from './documents/categoriaPlato';
import { plato } from './documents/plato';
import { resena } from './documents/resena';
import { paginaLegal } from './documents/paginaLegal';

/**
 * Los tipos `internationalizedArrayString`, `internationalizedArrayText` y
 * `internationalizedArrayPortableText` los registra el plugin
 * `sanity-plugin-internationalized-array` desde `apps/studio/sanity.config.ts`.
 */
export const schemaTypes = [
  // Config global
  idioma,
  // Por restaurante
  restaurante,
  categoriaVino,
  vino,
  categoriaPlato,
  plato,
  resena,
  paginaLegal,
];

export * from './constants';
export * from './lib/validacionI18n';
