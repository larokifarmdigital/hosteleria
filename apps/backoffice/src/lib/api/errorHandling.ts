'use client';

import { ApiError, type ErrorCode } from '@hosteleria/api-client';
import { showErrorToast } from './toast';

/**
 * Devuelve el mensaje humano listo para mostrar al usuario.
 *
 *  - `ApiError`: `err.message` ya viene del backend en español.
 *  - Resto: fallback genérico.
 */
export function handleApiError(err: unknown): string {
  if (ApiError.is(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Error inesperado. Inténtalo de nuevo.';
}

/**
 * Pinta `err.message` como toast. Para usar en `onError` de mutations:
 *
 *   const toastError = useErrorToast();
 *   useMutation({ mutationFn, onError: toastError });
 *
 * Devuelve una función estable (no useMemo porque el toast lib ya es idempotente).
 */
export function useErrorToast() {
  return (err: unknown) => showErrorToast(handleApiError(err));
}

/**
 * Narrowing + mensaje por código conocido. Útil en forms que quieren
 * mapear ciertos códigos a mensajes de campo:
 *
 *   if (ApiError.is(err, 'EMAIL_TAKEN')) setFieldError('email', err.message);
 */
export function matchErrorCode<T>(err: unknown, map: Partial<Record<ErrorCode, (e: ApiError) => T>>): T | null {
  if (!ApiError.is(err)) return null;
  const handler = map[err.code as ErrorCode];
  return handler ? handler(err) : null;
}

/**
 * Stub de observabilidad. Hoy loguea; mañana se reemplaza por
 * `Sentry.captureException(err, { extra: ctx })`.
 */
export function reportError(err: unknown, ctx?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('[reportError]', err, ctx);
  }
  // TODO: Sentry.captureException(err, { extra: ctx });
}

export { ApiError };
