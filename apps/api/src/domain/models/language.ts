export interface Language {
  readonly id: string;
  /** ISO 639-1 (`es`, `ca`, `en`, …). */
  readonly code: string;
  name: string;
  readonly createdAt: Date;
}

export class LanguageNotFoundError extends Error {
  constructor(idOrCode: string) { super(`language_not_found:${idOrCode}`); this.name = 'LanguageNotFoundError'; }
}
export class LanguageCodeTakenError extends Error {
  constructor(code: string) { super(`language_code_taken:${code}`); this.name = 'LanguageCodeTakenError'; }
}
export class LanguageInUseError extends Error {
  constructor() { super('language_in_use'); this.name = 'LanguageInUseError'; }
}
