import type { Language } from '../../../../domain/models/language.js';
import type { languages } from '../schema/content.js';

/** Fila Drizzle → entidad del dominio. */
export function rowToLanguage(row: typeof languages.$inferSelect): Language {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.createdAt
  };
}
