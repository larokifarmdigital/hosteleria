import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createApiClient, ApiError, type ApiClient, type SessionUser } from '@hosteleria/api-client';
import { API_BASE_PATH, apiApp } from '@/core/http/nextApp';

// El api vive en este mismo proceso: el código de servidor le pasa la petición
// directamente, sin salir a la red. El host no se resuelve nunca; solo hace
// falta para formar una URL válida.
const IN_PROCESS_URL = `http://backoffice.internal${API_BASE_PATH}`;

const inProcessFetch: typeof fetch = async (input, init) => apiApp.fetch(new Request(input, init));

/** Para RSC y server actions: reenvía la cookie de sesión al API. Sin
 *  `onError`: redirects y toasts solo tienen sentido en el browser; aquí el
 *  error sale tal cual hacia el try/catch o el error boundary. */
export async function getServerApi(): Promise<ApiClient> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  return createApiClient({ baseUrl: IN_PROCESS_URL, cookieHeader, fetch: inProcessFetch });
}

/** Una sola llamada por request aunque la pidan layout, guards y página. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const api = await getServerApi();
  return (await api.auth.session()).user;
});

/** Sin cookies: para llamadas públicas (login, forgot, health). */
export function getPublicApi(): ApiClient {
  return createApiClient({ baseUrl: IN_PROCESS_URL, fetch: inProcessFetch });
}

/** Petición suelta al api, para quien necesita la respuesta entera (el login lee su `Set-Cookie`). */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return inProcessFetch(`${IN_PROCESS_URL}${path}`, init);
}

export { ApiError };
export type { ApiClient };
