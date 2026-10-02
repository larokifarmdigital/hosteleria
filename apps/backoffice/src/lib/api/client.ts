import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { ApiError, reportError } from './error';
import { showErrorToast } from './toast';

/**
 * Cliente axios singleton usado por TODOS los hooks de `lib/query/hooks/*`.
 *
 * Importar como `import { http } from '@/lib/api'` y llamar `http.get()`,
 * `http.post()`, etc. tipando el response con generic.
 *
 * ─── Interceptors ─────────────────────────────────────────────────────
 *
 *  REQUEST
 *   • trace-id      — `X-Trace-Id: <uuid>` por request. Correla con los
 *                     logs del backend (/health lo loguea).
 *   • timing (dev)  — guarda performance.now() para medir duración.
 *
 *  RESPONSE
 *   • timing (dev)  — logea `[api] METHOD /path 200 123ms trace=…`.
 *   • 401           — si no es /auth/*, redirige a /login?next=... para
 *                     recuperar la ruta tras el login.
 *   • 5xx + network — toast + reportError() a Sentry (stub).
 *   • normalize     — todo error llega al caller como ApiError (no AxiosError).
 *
 *  4xx no-401 (409 conflict, 422 validation, …) no disparan toast: la UI
 *  debería mostrarlos en el form, no al vuelo.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const IS_DEV = process.env.NODE_ENV === 'development';

export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Request ────────────────────────────────────────────────────────
http.interceptors.request.use((req) => {
  const traceId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  req.headers = req.headers ?? ({} as any);
  (req.headers as any)['X-Trace-Id'] = traceId;
  (req as any).__traceId = traceId;
  if (IS_DEV) (req as any).__startedAt = performance.now();

  return req;
});

// ─── Response ───────────────────────────────────────────────────────
http.interceptors.response.use(
  (res) => {
    if (IS_DEV) {
      const started = (res.config as any).__startedAt as number | undefined;
      const traceId = (res.config as any).__traceId as string | undefined;
      if (started) {
        const dur = Math.round(performance.now() - started);
        const method = (res.config.method ?? 'GET').toUpperCase();
        const path = res.config.url ?? '';
        // eslint-disable-next-line no-console
        console.log(
          `%c[api] ${method} ${path} %c${res.status} %c${dur}ms %c${traceId?.slice(0, 8) ?? ''}`,
          'color:#888',
          'color:#2a7',
          'color:#888',
          'color:#aaa'
        );
      }
    }
    return res;
  },
  async (err: AxiosError) => {
    const status: number = err?.response?.status ?? 0;
    const url: string = err?.config?.url ?? '';
    const method: string = (err?.config?.method ?? 'GET').toUpperCase();
    const body = err?.response?.data;
    const traceId: string | undefined = (err?.config as any)?.__traceId;

    if (IS_DEV) {
      const started = (err?.config as any)?.__startedAt as number | undefined;
      const dur = started ? Math.round(performance.now() - started) : 0;
      // eslint-disable-next-line no-console
      console.warn(
        `%c[api] ${method} ${url} %c${status || 'ERR'} %c${dur}ms %c${traceId?.slice(0, 8) ?? ''}`,
        'color:#888',
        'color:#c22',
        'color:#888',
        'color:#aaa',
        body
      );
    }

    // 401 → redirect a /login con next, salvo si venía de /auth/*
    if (status === 401 && typeof window !== 'undefined' && !url.startsWith('/auth/')) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }

    // 5xx o network error → toast + Sentry
    if (status === 0 || status >= 500) {
      const message =
        status === 0
          ? 'No hay conexión con el servidor.'
          : 'Hubo un problema en el servidor. Reintentá en unos segundos.';
      showErrorToast(message);
      reportError(err, { url, method, status, traceId });
    }

    // Todo lo que ve el caller es un ApiError, no un AxiosError.
    return Promise.reject(ApiError.fromAxios(err));
  }
);
