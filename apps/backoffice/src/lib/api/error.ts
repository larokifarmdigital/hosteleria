import type { AxiosError } from 'axios';

/**
 * Error normalizado del api. Expone `status`, el body del backend
 * (típicamente `{ error: 'code', detail?: '...' }`) y el trace-id para
 * mostrarlo al user o copiarlo a soporte.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    public readonly traceId?: string,
    message?: string
  ) {
    super(message ?? `api_error_${status}`);
    this.name = 'ApiError';
  }

  /** Helper: `catch (e) { if (ApiError.is(e, 409)) ... }`. */
  static is(err: unknown, status?: number): err is ApiError {
    if (!(err instanceof ApiError)) return false;
    return status === undefined || err.status === status;
  }

  /** Crea una ApiError desde un AxiosError lanzado por el interceptor. */
  static fromAxios(err: AxiosError): ApiError {
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    const traceId = (err.config as any)?.__traceId as string | undefined;
    const message = (body as any)?.error ?? err.message;
    return new ApiError(status, body, traceId, message);
  }
}

/**
 * Hook para reportar errores al observability stack.
 *
 * STUB: hoy solo loguea en consola. Cuando añadamos `@sentry/nextjs`,
 * reemplazar el cuerpo por `Sentry.captureException(err, { extra: ctx })`.
 */
export function reportError(err: unknown, ctx?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error('[reportError]', err, ctx);
  }
  // TODO: Sentry.captureException(err, { extra: ctx });
}
