'use client';

import { ApiError, ErrorCode, type ErrorCode as ErrorCodeType } from '@hosteleria/api-client';
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
export function matchErrorCode<T>(err: unknown, map: Partial<Record<ErrorCodeType, (e: ApiError) => T>>): T | null {
  if (!ApiError.is(err)) return null;
  const handler = map[err.code as ErrorCodeType];
  return handler ? handler(err) : null;
}

/**
 * Observabilidad de errores.
 *
 * Hoy: loguea en consola (dev) y hace `window.__sentry?.captureException`
 * si existe (soft dependency — para no forzar bundle de Sentry).
 *
 * Cuando instalemos `@sentry/nextjs`:
 *   1. `pnpm --filter @hosteleria/backoffice add @sentry/nextjs`
 *   2. Reemplazar el cuerpo por `Sentry.captureException(err, { extra: ctx, tags: { code } })`.
 *   3. Pasar `traceId` del ApiError como tag para correlar con logs del Worker.
 */
export function reportError(err: unknown, ctx?: Record<string, unknown>): void {
  const code = ApiError.is(err) ? err.code : undefined;
  const traceId = ApiError.is(err) ? err.traceId : undefined;

  if (process.env.NODE_ENV === 'development') {
    console.error('[reportError]', { code, traceId, err, ctx });
  }

  // Soft Sentry: si hay un wrapper montado por otro feature, lo usa.
  const win = typeof window !== 'undefined' ? (window as any) : null;
  if (win?.Sentry?.captureException) {
    win.Sentry.captureException(err, { extra: { ...ctx, code, traceId } });
  }
}

export { ApiError, ErrorCode };
