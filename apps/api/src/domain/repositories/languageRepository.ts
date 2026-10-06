import type { Language } from '../models/language.js';

/**
 * Puerto de persistencia para `Language`.
 *
 * Los idiomas se usan tanto como catálogo (admin los lista/crea) como para
 * resolver `code → id` al crear/editar restaurantes.
 */
export interface LanguageRepository {
  list(): Promise<Language[]>;
  findByCode(code: string): Promise<Language | null>;
  findById(id: string): Promise<Language | null>;

  /**
   * Resuelve códigos ISO → ids. Lanza `LanguageNotFoundError` si algún code
   * del input no existe. Útil para `createWithLocales` / `replaceLocales`.
   */
  resolveCodes(codes: string[]): Promise<string[]>;

  /** Cuenta cuántos restaurantes tienen este idioma activo. Para pre-check de delete. */
  countUsage(languageId: string): Promise<number>;

  create(input: { code: string; name: string }): Promise<Language>;
  update(id: string, patch: { name?: string }): Promise<void>;
  deleteById(id: string): Promise<void>;
}
