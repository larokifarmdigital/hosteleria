import { idioma } from './documents/idioma';
import { restaurante } from './documents/restaurante';
import { espacio } from './documents/espacio';
import { categoriaVino } from './documents/categoriaVino';
import { vino } from './documents/vino';
import { categoriaPlato } from './documents/categoriaPlato';
import { plato } from './documents/plato';
import { categoriaBebida } from './documents/categoriaBebida';
import { bebida } from './documents/bebida';
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
  // Por restaurante (nivel grupo/marca)
  restaurante,
  paginaLegal,
  // Por espacio (nivel experiencia: restaurante, café, coctel, club…)
  espacio,
  categoriaVino,
  vino,
  categoriaPlato,
  plato,
  categoriaBebida,
  bebida,
  resena,
];

export * from './constants';
export * from './lib/validacionI18n';
export * from './lib/referenciaEspacio';
