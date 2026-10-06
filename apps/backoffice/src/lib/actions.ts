'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getApi, getPublicApi } from './api';
import { ApiError } from '@hosteleria/api-client';
import type { I18nString, Hero, Manifesto, ScheduleDay } from '@hosteleria/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/**
 * Server actions del backoffice — encapsulan las llamadas al api con
 * relay de cookies y revalidación de rutas afectadas.
 */

// ═════════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════════

export async function loginAction(_prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Introduce email y contraseña' };

  // Login directo al api (no via getApi porque necesitamos capturar Set-Cookie).
  console.log('[loginAction] POST', `${API_URL}/auth/login`, { email });
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    console.log('[loginAction] FAILED', { status: res.status, body });
    const msg =
      res.status === 401 ? 'Email o contraseña incorrectos' :
      res.status === 429 ? 'Demasiados intentos. Esperá un minuto.' :
      res.status === 404 ? 'Endpoint no encontrado — revisá NEXT_PUBLIC_API_URL' :
      res.status >= 500 ? `Error del servidor (${res.status})` :
      `Error ${res.status}: ${body?.error ?? 'desconocido'}`;
    return { error: msg };
  }

  console.log('[loginAction] OK');

  // Relay: mover Set-Cookie del api al cookie store de Next.
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/hs_session=([^;]+)/);
    if (match) {
      const cookieStore = await cookies();
      cookieStore.set('hs_session', match[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // 30 días (Lucia decide invalidación real)
      });
    }
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const api = await getApi();
  try { await api.auth.logout(); } catch { /* best-effort */ }
  const cookieStore = await cookies();
  cookieStore.delete('hs_session');
  redirect('/login');
}

// ═════════════════════════════════════════════════════════════════
// RESTAURANTS
// ═════════════════════════════════════════════════════════════════

export async function patchRestaurantAction(slug: string, patch: {
  name?: string;
  domain?: string;
  address?: { street?: string; city?: string; postalCode?: string; district?: string; country?: string };
  contact?: { phone?: string; whatsapp?: string; email?: string; web?: string };
  socials?: { instagram?: string; facebook?: string; tiktok?: string };
  activeLocaleCodes?: string[];
  defaultLocaleCode?: string;
}): Promise<{ error: string | null }> {
  try {
    const api = await getApi();
    await api.restaurants.patch(slug, patch);
    revalidatePath(`/restaurants/${slug}`);
    revalidatePath('/restaurants');
    revalidatePath('/dashboard');
    return { error: null };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'update_failed' };
  }
}

export async function publishRestaurantAction(slug: string): Promise<{ error: string | null }> {
  try {
    const api = await getApi();
    await api.restaurants.patch(slug, { state: 'published' });
    revalidatePath(`/restaurants/${slug}`);
    revalidatePath('/restaurants');
    revalidatePath('/dashboard');
    return { error: null };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'publish_failed' };
  }
}

// ═════════════════════════════════════════════════════════════════
// SPACES
// ═════════════════════════════════════════════════════════════════

export async function patchSpaceAction(restaurantSlug: string, spaceId: string, patch: {
  name?: string;
  descriptor?: string;
  hero?: Hero;
  manifesto?: Manifesto;
  schedule?: ScheduleDay[];
  isDefault?: boolean;
  state?: 'published' | 'draft';
}): Promise<{ error: string | null }> {
  try {
    const api = await getApi();
    await api.spaces.patch(restaurantSlug, spaceId, patch);
    revalidatePath(`/restaurants/${restaurantSlug}/spaces/${spaceId}`);
    revalidatePath(`/restaurants/${restaurantSlug}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'update_failed' };
  }
}

export async function createSpaceAction(restaurantSlug: string, body: {
  slug: string; name: string; type?: 'restaurant' | 'terraza' | 'cafe' | 'coctel' | 'club' | 'live_music' | 'otro';
  descriptor?: string;
}): Promise<{ error: string | null; id?: string }> {
  try {
    const api = await getApi();
    const space = await api.spaces.create(restaurantSlug, body);
    revalidatePath(`/restaurants/${restaurantSlug}`);
    return { error: null, id: space.id };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'create_failed' };
  }
}

// ═════════════════════════════════════════════════════════════════
// DISHES
// ═════════════════════════════════════════════════════════════════

export async function toggleDishActiveAction(id: string, active: boolean): Promise<{ error: string | null }> {
  try {
    const api = await getApi();
    await api.dishes.patch(id, { active });
    revalidatePath('/dishes');
    return { error: null };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'toggle_failed' };
  }
}

// ═════════════════════════════════════════════════════════════════
// LANGUAGES
// ═════════════════════════════════════════════════════════════════

export async function createLanguageAction(_prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  if (!code || !name) return { error: 'Código y nombre son obligatorios' };
  try {
    const api = await getApi();
    await api.languages.create({ code, name });
    revalidatePath('/settings');
    return { error: null };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return { error: `El código "${code}" ya existe` };
    return { error: err instanceof ApiError ? err.message : 'create_failed' };
  }
}

// ═════════════════════════════════════════════════════════════════
// LOCALES por restaurante (checkboxes del aside)
// ═════════════════════════════════════════════════════════════════

export async function updateRestaurantLocalesAction(slug: string, activeLocaleCodes: string[], defaultLocaleCode: string): Promise<{ error: string | null }> {
  if (!activeLocaleCodes.includes(defaultLocaleCode)) {
    return { error: 'El idioma por defecto debe estar entre los activos' };
  }
  try {
    const api = await getApi();
    await api.restaurants.patch(slug, { activeLocaleCodes, defaultLocaleCode });
    revalidatePath(`/restaurants/${slug}`);
    revalidatePath('/dashboard');
    revalidatePath('/settings');
    return { error: null };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'update_failed' };
  }
}

// ═════════════════════════════════════════════════════════════════
// Helper genérico para setear un campo i18n del hero
// ═════════════════════════════════════════════════════════════════

export async function updateHeroFieldAction(restaurantSlug: string, spaceId: string, field: keyof Hero, value: I18nString): Promise<{ error: string | null }> {
  try {
    const api = await getApi();
    const space = await api.spaces.get(restaurantSlug, spaceId);
    const newHero: Hero = { ...space.hero, [field]: value };
    await api.spaces.patch(restaurantSlug, spaceId, { hero: newHero });
    revalidatePath(`/restaurants/${restaurantSlug}/spaces/${spaceId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'update_failed' };
  }
}
