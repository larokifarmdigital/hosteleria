'use client';

import { createApiClient, ApiError, type ApiClient } from '@hosteleria/api-client';
import { reportError } from './errorHandling';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const IS_DEV = process.env.NODE_ENV === 'development';

/** Cliente del API para el browser. `X-Trace-Id` y `credentials: 'include'`
 *  los pone el package: no hay que reenviar cookies a mano. */
export const api: ApiClient = createApiClient({
  baseUrl: API_URL,

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

    // Sin redirect si ya estamos en /login o en un flow de /auth/*: evita el bucle.
    if (err.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !ctx.path.startsWith('/auth/')) {
        const next = encodeURIComponent(path + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }

    if (err.isNetwork || err.status >= 500) {
      reportError(err, { url: ctx.url, method: ctx.method, status: err.status, traceId: ctx.traceId });
    }
  }
});

export { ApiError };
export type { ApiClient };
