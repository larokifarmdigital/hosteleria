/**
 * Códigos de error estables del backend, en SCREAMING_SNAKE_CASE.
 *
 * El cliente puede ramificar lógica sobre estos valores (sin usar el `message`
 * para branching — ese es texto para humanos). Mantén la lista sincronizada con
 * `apps/backoffice/src/core/http` + las subclases de `DomainError`.
 */
/**
 * Const object con los codes como valores — para autocompletado:
 *
 *   if (ApiError.is(err, ErrorCode.EMAIL_TAKEN)) { ... }
 *
 * Union type `ErrorCode` derivado para tipado estricto en firmas.
 */
export const ErrorCode = {
  // ─── 400 ────────────────────────────────────────────────────────
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_LOCALE: 'UNKNOWN_LOCALE',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  NO_SNAPSHOT: 'NO_SNAPSHOT',
  LANGUAGE_IN_USE: 'LANGUAGE_IN_USE',
  CANNOT_DELETE_LAST_SPACE: 'CANNOT_DELETE_LAST_SPACE',
  CANNOT_DELETE_SELF: 'CANNOT_DELETE_SELF',
  MUST_HAVE_DEFAULT_SPACE: 'MUST_HAVE_DEFAULT_SPACE',
  CATEGORY_HAS_DISHES: 'CATEGORY_HAS_DISHES',
  CATEGORY_HAS_WINES: 'CATEGORY_HAS_WINES',
  MEDIA_IN_USE: 'MEDIA_IN_USE',
  MEDIA_NOT_IN_RESTAURANT: 'MEDIA_NOT_IN_RESTAURANT',
  TRANSLATIONS_INCOMPLETE: 'TRANSLATIONS_INCOMPLETE',
  UPLOAD_NOT_FOUND_IN_R2: 'UPLOAD_NOT_FOUND_IN_R2',
  UPLOAD_SIZE_MISMATCH: 'UPLOAD_SIZE_MISMATCH',
  INVALID_OR_EXPIRED_TOKEN: 'INVALID_OR_EXPIRED_TOKEN',
  MISSING_SLUG: 'MISSING_SLUG',
  // ─── 401 ────────────────────────────────────────────────────────
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  // ─── 403 ────────────────────────────────────────────────────────
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  RESTAURANT_FORBIDDEN: 'RESTAURANT_FORBIDDEN',
  SPACE_FORBIDDEN: 'SPACE_FORBIDDEN',
  // ─── 404 ────────────────────────────────────────────────────────
  RESTAURANT_NOT_FOUND: 'RESTAURANT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  LANGUAGE_NOT_FOUND: 'LANGUAGE_NOT_FOUND',
  SPACE_NOT_FOUND: 'SPACE_NOT_FOUND',
  DISH_NOT_FOUND: 'DISH_NOT_FOUND',
  DISH_CATEGORY_NOT_FOUND: 'DISH_CATEGORY_NOT_FOUND',
  WINE_NOT_FOUND: 'WINE_NOT_FOUND',
  WINE_CATEGORY_NOT_FOUND: 'WINE_CATEGORY_NOT_FOUND',
  MEDIA_NOT_FOUND: 'MEDIA_NOT_FOUND',
  // ─── 409 ────────────────────────────────────────────────────────
  SLUG_TAKEN: 'SLUG_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  LANGUAGE_CODE_TAKEN: 'LANGUAGE_CODE_TAKEN',
  SPACE_SLUG_TAKEN: 'SPACE_SLUG_TAKEN',
  // ─── 429 ────────────────────────────────────────────────────────
  RATE_LIMITED: 'RATE_LIMITED',
  // ─── 500 ────────────────────────────────────────────────────────
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  // Fallbacks de red/cliente
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Shape del body que devuelve el backend en cualquier respuesta de error. */
export interface ErrorBody {
  code: string;
  message: string;
}

/**
 * Error normalizado para TODA llamada al API.
 *
 *  - `status` — código HTTP (0 si red cayó / no hubo response).
 *  - `code` — identificador estable (SCREAMING_SNAKE_CASE). Para branching.
 *  - `message` — texto en español ya listo para pintar al usuario (viene del backend).
 *  - `traceId` — valor del header `X-Trace-Id` que el client añade a cada request.
 *  - `body` — payload original por si hace falta ver `details` o campos extra.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | string,
    message: string,
    public readonly body: unknown = null,
    public readonly traceId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Narrowing helper: `if (ApiError.is(err, 'EMAIL_TAKEN')) ...`.
   * Sin segundo arg, solo chequea instancia.
   */
  static is(err: unknown, code?: ErrorCode | string): err is ApiError {
    return err instanceof ApiError && (code === undefined || err.code === code);
  }

  /** `true` si el error no vino del servidor (fetch rechazó, timeout, offline). */
  get isNetwork(): boolean {
    return this.status === 0 || this.code === 'NETWORK_ERROR';
  }
}
