import axios, { AxiosError, type AxiosInstance } from 'axios';

/**
 * Cliente HTTP axios para componentes CLIENT (hooks de TanStack Query).
 *
 * Para componentes SERVER (RSC, server actions), usar `lib/api.ts` que forwarda
 * la cookie de sesión del request actual.
 *
 * - `withCredentials: true` → envía la cookie `auth_session` cross-subdomain
 *   (en prod backoffice=studio.hosteleria.cat / api=api.hosteleria.cat).
 * - Interceptor 401 → al perder sesión, redirige a /login con el `?next=...`
 *   para volver al mismo sitio tras loguearse.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

/** Error normalizado del api — expone status + body del backend. */
export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `api_error_${status}`);
    this.name = 'ApiError';
  }
}

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status ?? 0;
    const body = err.response?.data as any;

    // 401 fuera de /auth/* → sesión perdida, mandamos a login.
    if (status === 401 && typeof window !== 'undefined') {
      const path = err.config?.url ?? '';
      if (!path.startsWith('/auth/')) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }

    return Promise.reject(new ApiError(status, body, body?.error));
  }
);
