import { DomainError } from '@/core/shared/domain';

export interface Language {
  readonly id: string;
  readonly code: string;
  name: string;
  readonly createdAt: Date;
}

export class LanguageNotFoundError extends DomainError {
  readonly code = 'LANGUAGE_NOT_FOUND';
  readonly status = 404;
  constructor(_idOrCode: string) {
    super('El idioma no existe.');
    this.name = 'LanguageNotFoundError';
  }
}
export class LanguageCodeTakenError extends DomainError {
  readonly code = 'LANGUAGE_CODE_TAKEN';
  readonly status = 409;
  constructor(code: string) {
    super(`El código «${code}» ya está dado de alta.`);
    this.name = 'LanguageCodeTakenError';
  }
}
export class LanguageInUseError extends DomainError {
  readonly code = 'LANGUAGE_IN_USE';
  readonly status = 400;
  constructor() {
    super('No puedes borrar este idioma: hay restaurantes que lo tienen activo.');
    this.name = 'LanguageInUseError';
  }
}
