'use client';

import { ApiError, ErrorCode, type ErrorCode as ErrorCodeType } from '@hosteleria/api-client';
import { showErrorToast } from './toast';

/** El `message` de un `ApiError` ya viene del backend en español, listo para pintar. */
export function handleApiError(err: unknown): string {
  if (ApiError.is(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Error inesperado. Inténtalo de nuevo.';
}

/** Para `onError` de mutations: `useMutation({ mutationFn, onError: useErrorToast() })`. */
export function useErrorToast() {
  return (err: unknown) => showErrorToast(handleApiError(err));
}

/** Para forms que mapean ciertos códigos a errores de campo. */
export function matchErrorCode<T>(err: unknown, map: Partial<Record<ErrorCodeType, (e: ApiError) => T>>): T | null {
  if (!ApiError.is(err)) return null;
  const handler = map[err.code as ErrorCodeType];
  return handler ? handler(err) : null;
}

/** Loguea en dev y delega en `window.Sentry` si existe: dependencia opcional,
 *  para no meter Sentry en el bundle. */
export function reportError(err: unknown, ctx?: Record<string, unknown>): void {
  const code = ApiError.is(err) ? err.code : undefined;
  const traceId = ApiError.is(err) ? err.traceId : undefined;

  if (process.env.NODE_ENV === 'development') {
    console.error('[reportError]', { code, traceId, err, ctx });
  }

  const win = typeof window !== 'undefined' ? (window as any) : null;
  if (win?.Sentry?.captureException) {
    win.Sentry.captureException(err, { extra: { ...ctx, code, traceId } });
  }
}

export { ApiError, ErrorCode };
