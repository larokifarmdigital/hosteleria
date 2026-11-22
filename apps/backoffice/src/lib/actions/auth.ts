'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerApi } from '../api/server';
import { SESSION_COOKIE, safeNext } from '../auth/paths';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/** fetch directo (no `getServerApi`) para capturar el `Set-Cookie` del API y
 *  promoverlo al cookie store de Next. */
export async function loginAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string | null; email?: string }> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? ''));
  // El email vuelve con el error: el formulario se vacía tras enviarse y así no hay que reescribirlo.
  if (!email || !password) return { error: 'Introduce email y contraseña.', email };

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { code?: string; message?: string } | null;
    return { error: body?.message ?? 'Error inesperado. Inténtalo de nuevo.', email };
  }

  const setCookie = res.headers.get('set-cookie');
  const match = setCookie?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, match[1], {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // 30 días: Lucia decide la invalidación real; esto es solo el límite del browser.
      maxAge: 60 * 60 * 24 * 30
    });
  }

  redirect(next);
}

export async function logoutAction() {
  const api = await getServerApi();
  try { await api.auth.logout(); } catch { /* best-effort */ }
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
