/**
 * Base de todos los errores del dominio.
 *
 * Lleva dos piezas separadas:
 *  - `code` — identificador estable para lógica del cliente (branching, i18n, logs).
 *  - `message` — texto en español listo para pintar al usuario sin traducir.
 *
 * El HTTP handler serializa a `{ code, message }` con el `status` propio.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: 400 | 401 | 403 | 404 | 409;
}

/**
 * Fallo de validación de input (body / query / param).
 *
 * El wrapper `interface/http/validate.ts` lo lanza cuando un `zValidator`
 * falla, para que viaje por `globalErrorHandler` con el mismo shape
 * `{ code, message }` que el resto de errores.
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly status = 400;
  /** Issues de zod — útil si el cliente quiere subrayar el campo exacto. */
  readonly issues: Array<{ path: string; message: string }>;
  constructor(issues: Array<{ path: string; message: string }>) {
    const first = issues[0];
    const where = first?.path ? `«${first.path}»: ` : '';
    super(`${where}${first?.message ?? 'Datos inválidos.'}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
