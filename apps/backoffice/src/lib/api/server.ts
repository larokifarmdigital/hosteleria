import { cookies } from 'next/headers';
import { createApiClient, ApiError, type ApiClient } from '@hosteleria/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/**
 * Cliente para RSC y server actions.
 *
 * Forwarda la cookie de sesión del user actual al API — así el backend ve
 * al mismo usuario que está autenticado en Next. NO monta `onError` (las
 * redirecciones y toasts solo tienen sentido en el browser; los server
 * usages deberían dejar que el error salga y manejarlo con try/catch o
 * dejar que Next.js lo propague al error boundary).
 *
 *   const api = await getServerApi();
 *   const list = await api.restaurants.list();
 */
export async function getServerApi(): Promise<ApiClient> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  return createApiClient({ baseUrl: API_URL, cookieHeader });
}

/** Cliente SIN cookies — para llamadas públicas (login, forgot, health). */
export function getPublicApi(): ApiClient {
  return createApiClient({ baseUrl: API_URL });
}

export { ApiError };
export type { ApiClient };
