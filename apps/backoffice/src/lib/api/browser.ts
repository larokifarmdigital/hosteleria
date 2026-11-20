'use client';

import { createApiClient, ApiError, type ApiClient } from '@hosteleria/api-client';
import { reportError } from './errorHandling';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Cliente del API para componentes CLIENT.
 *
 * Monta los hooks del package con el comportamiento que tenía el axios viejo:
 *  - `X-Trace-Id` por request (lo añade el package).
 *  - 401 en ruta protegida → redirect a `/login?next=...`.
 *  - 5xx o network → `reportError` (hoy loguea; mañana Sentry).
 *  - Logging en dev con duración + traceId recortado.
 *
 * `credentials: 'include'` lo hace el package. No hay que forwardear
 * cookies manualmente desde el browser.
 */
export const api: ApiClient = createApiClient({
  baseUrl: API_URL,

  onRequest(ctx) {
    if (IS_DEV) {
      // Guardamos el startedAt — el package ya lo tiene, pero facilita el log en onError.
      (ctx as any).__loggedStart = ctx.startedAt;
    }
  },

  onError(err, ctx) {
    const dur = Date.now() - ctx.startedAt;
    const short = ctx.traceId.slice(0, 8);

    if (IS_DEV) {
      console.warn(
        `%c[api] ${ctx.method} ${ctx.path} %c${err.status || 'ERR'} %c${dur}ms %c${short}`,
        'color:#888', 'color:#c22', 'color:#888', 'color:#aaa',
        err.code, err.message
      );
    }

    // 401 → forzar re-login (salvo que ya estemos en /login o en flows de auth).
    if (err.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !ctx.path.startsWith('/auth/')) {
        const next = encodeURIComponent(path + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }

    // Red caída o 5xx → observabilidad.
    if (err.isNetwork || err.status >= 500) {
      reportError(err, { url: ctx.url, method: ctx.method, status: err.status, traceId: ctx.traceId });
    }
  }
});

export { ApiError };
export type { ApiClient };
