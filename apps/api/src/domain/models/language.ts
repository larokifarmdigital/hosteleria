/**
 * Entidad `Language` — idioma disponible en el sistema.
 *
 * Los idiomas son globales (compartidos entre todos los restaurantes). Cada
 * restaurant elige cuáles tiene activos vía `restaurant_locales` (m2m).
 *
 * El `code` es ISO 639-1 (`es`, `ca`, `en`, …).
 */

export interface Language {
  readonly id: string;
  readonly code: string;     // 'es', 'ca', 'en', ...
  name: string;              // 'Español', 'Català', 'English', ...
  readonly createdAt: Date;
}

// ─── Domain errors ───────────────────────────────────────────────
export class LanguageNotFoundError extends Error {
  constructor(idOrCode: string) { super(`language_not_found:${idOrCode}`); this.name = 'LanguageNotFoundError'; }
}
export class LanguageCodeTakenError extends Error {
  constructor(code: string) { super(`language_code_taken:${code}`); this.name = 'LanguageCodeTakenError'; }
}
export class LanguageInUseError extends Error {
  constructor() { super('language_in_use'); this.name = 'LanguageInUseError'; }
}
