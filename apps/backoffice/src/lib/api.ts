import { cookies } from 'next/headers';
import { createApiClient, type ApiClient } from '@hosteleria/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/**
 * Cliente del API para uso en Server Components / server actions.
 * Forwarda la cookie de sesión del usuario actual al api — así el api
 * ve al mismo usuario que está autenticado en Next.
 *
 * Uso: `const api = await getApi(); const restaurants = await api.restaurants.list();`
 */
export async function getApi(): Promise<ApiClient> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  return createApiClient({ baseUrl: API_URL, cookieHeader });
}

/**
 * Cliente sin cookies — para llamadas públicas como `/health` o `login`.
 * En login, la cookie viene en el SET-COOKIE de la respuesta (Set-Cookie
 * relay se maneja en la server action).
 */
export function getPublicApi(): ApiClient {
  return createApiClient({ baseUrl: API_URL });
}

export { ApiError } from '@hosteleria/api-client';
export type * from '@hosteleria/api-client';
