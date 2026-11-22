import type { Language } from '../models/language.js';

export interface LanguageRepository {
  list(): Promise<Language[]>;
  findByCode(code: string): Promise<Language | null>;
  findById(id: string): Promise<Language | null>;

  /** Lanza `LanguageNotFoundError` si algún code no existe. */
  resolveCodes(codes: string[]): Promise<string[]>;

  /** Nº de restaurantes con este idioma activo (pre-check de delete). */
  countUsage(languageId: string): Promise<number>;

  create(input: { code: string; name: string }): Promise<Language>;
  update(id: string, patch: { name?: string }): Promise<void>;
  deleteById(id: string): Promise<void>;
}
