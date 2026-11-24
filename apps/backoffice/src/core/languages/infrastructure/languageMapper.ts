import type { Language } from '../domain/models/language';
import type { languages } from '@/core/shared/infrastructure/drizzle/schema';

export function rowToLanguage(row: typeof languages.$inferSelect): Language {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.createdAt
  };
}
