/** `code`: identificador estable para el cliente. `message`: texto en español
 *  listo para pintar al usuario. */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: 400 | 401 | 403 | 404 | 409;
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly status = 400;
  readonly issues: Array<{ path: string; message: string }>;
  constructor(issues: Array<{ path: string; message: string }>) {
    const first = issues[0];
    const where = first?.path ? `«${first.path}»: ` : '';
    super(`${where}${first?.message ?? 'Datos inválidos.'}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
