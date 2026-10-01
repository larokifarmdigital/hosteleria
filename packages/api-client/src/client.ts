import type {
  Language,
  User,
  SessionUser,
  Restaurant,
  Space,
  DishCategory,
  Dish,
  WineCategory,
  Wine,
  MediaAsset,
  UploadUrlResponse,
  I18nString
} from './types';

export interface ApiClientOpts {
  /** URL base sin barra final: "https://api.hosteleria.cat" o "http://localhost:8787" */
  baseUrl: string;
  /** Cookies opcionales para enviar (server-side). En el browser, `credentials: 'include'` las envía. */
  cookieHeader?: string;
  /** Hook para hacer fetch — permite polyfill en tests o server actions. */
  fetch?: typeof globalThis.fetch;
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `api_error_${status}`);
    this.name = 'ApiError';
  }
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function request<T>(opts: ApiClientOpts, path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (opts.cookieHeader) headers.set('Cookie', opts.cookieHeader);

  const res = await doFetch(`${opts.baseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include'
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body: any = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body, body?.error);
  return body as T;
}

/**
 * Cliente tipado del API. Cada método devuelve el DTO listo para usarse
 * en RSC o server actions. `credentials: 'include'` para cookies.
 */
export function createApiClient(opts: ApiClientOpts) {
  const req = <T>(path: string, init?: RequestInit) => request<T>(opts, path, init);

  return {
    // ─── Auth ───────────────────────────────────────────────────
    auth: {
      login: (email: string, password: string) =>
        req<{ user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
      logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),
      session: () => req<{ user: SessionUser | null }>('/auth/session')
    },

    // ─── Restaurants ────────────────────────────────────────────
    restaurants: {
      list: () => req<{ restaurants: Restaurant[] }>('/restaurants').then(r => r.restaurants),
      get: (slug: string) =>
        req<{ restaurant: Restaurant }>(`/restaurants/${slug}`).then(r => r.restaurant),
      create: (body: {
        slug: string; name: string; domain: string; logoInitial?: string;
        defaultLocaleCode: string; activeLocaleCodes: string[];
      }) =>
        req<{ restaurant: Restaurant }>('/restaurants', { method: 'POST', body: JSON.stringify(body) }).then(r => r.restaurant),
      patch: (slug: string, body: Partial<Omit<Restaurant, 'id' | 'slug' | 'completePercent' | 'spacesCount' | 'dishesCount' | 'winesCount' | 'activeLocales' | 'defaultLocale' | 'lastPublishedAt'>> & { defaultLocaleCode?: string; activeLocaleCodes?: string[] }) =>
        req<{ restaurant: Restaurant }>(`/restaurants/${slug}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.restaurant),
      delete: (slug: string) => req<{ ok: true }>(`/restaurants/${slug}`, { method: 'DELETE' })
    },

    // ─── Spaces ─────────────────────────────────────────────────
    spaces: {
      list: (restaurantSlug: string) =>
        req<{ spaces: Space[] }>(`/restaurants/${restaurantSlug}/spaces`).then(r => r.spaces),
      get: (restaurantSlug: string, spaceId: string) =>
        req<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`).then(r => r.space),
      create: (restaurantSlug: string, body: {
        slug: string; name: string; type?: Space['type']; descriptor?: string; isDefault?: boolean;
      }) =>
        req<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces`, { method: 'POST', body: JSON.stringify(body) }).then(r => r.space),
      patch: (restaurantSlug: string, spaceId: string, body: Partial<Pick<Space, 'name' | 'type' | 'descriptor' | 'isDefault' | 'order' | 'coverGradient' | 'state' | 'hero' | 'manifesto' | 'schedule'>>) =>
        req<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.space),
      delete: (restaurantSlug: string, spaceId: string) =>
        req<{ ok: true }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`, { method: 'DELETE' })
    },

    // ─── Dishes ─────────────────────────────────────────────────
    dishes: {
      list: (filters?: { restaurantSlug?: string; categoryId?: string; missingLocale?: string }) =>
        req<{ dishes: Dish[] }>(`/dishes${buildQuery(filters)}`).then(r => r.dishes),
      get: (id: string) => req<{ dish: Dish }>(`/dishes/${id}`).then(r => r.dish),
      create: (body: {
        spaceId: string; categoryId: string; name: I18nString; note?: I18nString;
        price?: number; order?: number; active?: boolean; imageAssetId?: string; imageGradient?: string;
      }) => req<{ dish: Dish }>('/dishes', { method: 'POST', body: JSON.stringify(body) }).then(r => r.dish),
      patch: (id: string, body: Partial<Omit<Dish, 'id' | 'spaceId' | 'restaurantSlug' | 'restaurantName' | 'categoryName' | 'localesFilled'>>) =>
        req<{ dish: Dish }>(`/dishes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.dish),
      delete: (id: string) => req<{ ok: true }>(`/dishes/${id}`, { method: 'DELETE' }),
      categories: {
        list: (spaceId?: string) =>
          req<{ categories: DishCategory[] }>(`/dishes/categories${spaceId ? `?spaceId=${spaceId}` : ''}`).then(r => r.categories),
        create: (body: { spaceId: string; name: I18nString; order?: number }) =>
          req<{ category: DishCategory }>('/dishes/categories', { method: 'POST', body: JSON.stringify(body) }).then(r => r.category),
        patch: (id: string, body: { name?: I18nString; order?: number }) =>
          req<{ category: DishCategory }>(`/dishes/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.category),
        delete: (id: string) => req<{ ok: true }>(`/dishes/categories/${id}`, { method: 'DELETE' })
      }
    },

    // ─── Wines ──────────────────────────────────────────────────
    wines: {
      list: (filters?: { restaurantSlug?: string; categoryId?: string }) =>
        req<{ wines: Wine[] }>(`/wines${buildQuery(filters)}`).then(r => r.wines),
      create: (body: {
        spaceId: string; categoryId: string; name: string; region?: string; note?: I18nString;
        priceGlass?: number; priceBottle?: number; order?: number; active?: boolean; imageGradient?: string;
      }) => req<{ wine: Wine }>('/wines', { method: 'POST', body: JSON.stringify(body) }).then(r => r.wine),
      patch: (id: string, body: Partial<Omit<Wine, 'id' | 'spaceId' | 'restaurantSlug' | 'restaurantName' | 'categoryName' | 'localesFilled'>>) =>
        req<{ wine: Wine }>(`/wines/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.wine),
      delete: (id: string) => req<{ ok: true }>(`/wines/${id}`, { method: 'DELETE' }),
      categories: {
        list: (spaceId?: string) =>
          req<{ categories: WineCategory[] }>(`/wines/categories${spaceId ? `?spaceId=${spaceId}` : ''}`).then(r => r.categories),
        create: (body: { spaceId: string; name: I18nString; order?: number }) =>
          req<{ category: WineCategory }>('/wines/categories', { method: 'POST', body: JSON.stringify(body) }).then(r => r.category),
        delete: (id: string) => req<{ ok: true }>(`/wines/categories/${id}`, { method: 'DELETE' })
      }
    },

    // ─── Languages ──────────────────────────────────────────────
    languages: {
      list: () => req<{ languages: Language[] }>('/languages').then(r => r.languages),
      create: (body: { code: string; name: string }) =>
        req<{ language: Language }>('/languages', { method: 'POST', body: JSON.stringify(body) }).then(r => r.language),
      patch: (id: string, body: { name?: string }) =>
        req<{ language: Language }>(`/languages/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.language),
      delete: (id: string) => req<{ ok: true }>(`/languages/${id}`, { method: 'DELETE' })
    },

    // ─── Users ──────────────────────────────────────────────────
    users: {
      list: () => req<{ users: User[] }>('/users').then(r => r.users),
      create: (body: {
        email: string; password: string; name: string; role?: 'admin' | 'editor';
        avatarColor?: string; restaurantSlugs?: string[];
      }) => req<{ user: User }>('/users', { method: 'POST', body: JSON.stringify(body) }).then(r => r.user),
      patch: (id: string, body: {
        name?: string; role?: 'admin' | 'editor'; avatarColor?: string;
        restaurantSlugs?: string[]; password?: string;
      }) => req<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.user),
      delete: (id: string) => req<{ ok: true }>(`/users/${id}`, { method: 'DELETE' })
    },

    // ─── Media ──────────────────────────────────────────────────
    media: {
      list: (filters?: { restaurantSlug?: string; usage?: string; missingAlt?: boolean }) =>
        req<{ media: MediaAsset[] }>(`/media${buildQuery(filters)}`).then(r => r.media),
      uploadUrl: (body: { restaurantSlug: string; filename: string; mimeType: string; sizeKb: number }) =>
        req<UploadUrlResponse>('/media/upload-url', { method: 'POST', body: JSON.stringify(body) }),
      confirm: (mediaId: string, body: { width?: number; height?: number; altText?: I18nString }) =>
        req<{ media: MediaAsset }>(`/media/${mediaId}/confirm`, { method: 'POST', body: JSON.stringify(body) }).then(r => r.media),
      patch: (id: string, body: { usage?: MediaAsset['usage']; hasAltText?: boolean; altText?: I18nString }) =>
        req<{ media: MediaAsset }>(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.media),
      delete: (id: string) => req<{ ok: true }>(`/media/${id}`, { method: 'DELETE' })
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
