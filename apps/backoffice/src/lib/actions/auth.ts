'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerApi } from '../api/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/** fetch directo (no `getServerApi`) para capturar el `Set-Cookie` del API y
 *  promoverlo al cookie store de Next. */
export async function loginAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string | null }> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Introduce email y contraseña.' };

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { code?: string; message?: string } | null;
    return { error: body?.message ?? 'Error inesperado. Inténtalo de nuevo.' };
  }

  const setCookie = res.headers.get('set-cookie');
  const match = setCookie?.match(/hs_session=([^;]+)/);
  if (match) {
    const cookieStore = await cookies();
    cookieStore.set('hs_session', match[1], {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // 30 días: Lucia decide la invalidación real; esto es solo el límite del browser.
      maxAge: 60 * 60 * 24 * 30
    });
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const api = await getServerApi();
  try { await api.auth.logout(); } catch { /* best-effort */ }
  const cookieStore = await cookies();
  cookieStore.delete('hs_session');
  redirect('/login');
}
