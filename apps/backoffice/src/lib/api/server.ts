import { cookies } from 'next/headers';
import { createApiClient, ApiError, type ApiClient } from '@hosteleria/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/** Para RSC y server actions: reenvía la cookie de sesión al API. Sin
 *  `onError`: redirects y toasts solo tienen sentido en el browser; aquí el
 *  error sale tal cual hacia el try/catch o el error boundary. */
export async function getServerApi(): Promise<ApiClient> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  return createApiClient({ baseUrl: API_URL, cookieHeader });
}

/** Sin cookies: para llamadas públicas (login, forgot, health). */
export function getPublicApi(): ApiClient {
  return createApiClient({ baseUrl: API_URL });
}

export { ApiError };
export type { ApiClient };
