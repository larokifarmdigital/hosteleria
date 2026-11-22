import type {
  Language,
  User,
  SessionUser,
  Restaurant,
  Space,
  DishCategory,
  Dish,
  DishKind,
  WineCategory,
  Wine,
  MediaAsset,
  MediaReferences,
  LegalPage,
  LegalPageType,
  PendingTask,
  SiteStatus,
  PublishedSite,
  UploadUrlResponse,
  I18nString
} from './types';
import { ApiError, type ErrorBody, type ErrorCode } from './errors';

/**
 * Context que `onRequest`/`onError` reciben. Es mutable: el hook puede
 * modificar headers, loguear timings, o leer `traceId` para asociar logs.
 */
export interface RequestContext {
  method: string;
  path: string;
  url: string;
  headers: Headers;
  /** Añadido por el client antes de llamar al hook. */
  traceId: string;
  /** Timestamp antes de `fetch()`. Útil en `onError` para medir duración. */
  startedAt: number;
}

export interface ApiClientOpts {
  /** URL base sin barra final: "https://api.hosteleria.cat" o "http://localhost:8787". */
  baseUrl: string;
  /** Cookies opcionales (server-side). En el browser basta con `credentials: 'include'`. */
  cookieHeader?: string;
  /** Override de `fetch` — para tests, workers, o server actions con instrumentación. */
  fetch?: typeof globalThis.fetch;
  /** Se ejecuta antes de cada request. Modificar `ctx.headers` muta el request real. */
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  /** Se ejecuta cuando `request()` rechaza con `ApiError`. Puede re-lanzar para abortar flujo. */
  onError?: (err: ApiError, ctx: RequestContext) => void | Promise<void>;
  /**
   * Generador de trace-id. Por defecto `crypto.randomUUID()` cuando existe,
   * fallback a `Date.now()` + random. Útil overridear en tests para IDs estables.
   */
  traceId?: () => string;
}

export { ApiError };
export type { ErrorBody, ErrorCode };

function defaultTraceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

/** Parsea el body de error del backend: `{ code, message }`. Fallbacks defensivos. */
function parseErrorBody(body: unknown, status: number): { code: string; message: string } {
  if (body && typeof body === 'object') {
    const b = body as Partial<ErrorBody>;
    if (typeof b.code === 'string' && typeof b.message === 'string') {
      return { code: b.code, message: b.message };
    }
  }
  // El body no cumple el contrato (edge, p.ej. Workers devolviendo text/plain
  // de un panic antes de llegar a `globalErrorHandler`).
  return {
    code: status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR',
    message: typeof body === 'string' && body.length < 300
      ? body
      : 'Error inesperado. Inténtalo de nuevo.'
  };
}

async function request<T>(opts: ApiClientOpts, path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (opts.cookieHeader) headers.set('Cookie', opts.cookieHeader);

  const traceId = (opts.traceId ?? defaultTraceId)();
  headers.set('X-Trace-Id', traceId);

  const url = `${opts.baseUrl}${path}`;
  const ctx: RequestContext = { method, path, url, headers, traceId, startedAt: Date.now() };

  if (opts.onRequest) await opts.onRequest(ctx);

  let res: Response;
  try {
    // `no-store`: el api marca los GET como cacheables 30 s y el navegador
    // devolvería datos viejos justo después de guardar. La caché es TanStack Query.
    res = await doFetch(url, { cache: 'no-store', ...init, headers, credentials: 'include' });
  } catch (netErr) {
    // Fetch rechazó antes de recibir response (offline, DNS, CORS…).
    const err = new ApiError(0, 'NETWORK_ERROR', 'No hay conexión con el servidor.', netErr, traceId);
    if (opts.onError) await opts.onError(err, ctx);
    throw err;
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body: unknown = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const { code, message } = parseErrorBody(body, res.status);
    const err = new ApiError(res.status, code, message, body, traceId);
    if (opts.onError) await opts.onError(err, ctx);
    throw err;
  }

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
      session: () => req<{ user: SessionUser | null }>('/auth/session'),
      forgot: (email: string) =>
        req<{ ok: true }>('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
      reset: (token: string, newPassword: string) =>
        req<{ ok: true }>('/auth/reset', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
      setPassword: (token: string, newPassword: string) =>
        req<{ ok: true }>('/auth/set-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) })
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
      delete: (slug: string) => req<{ ok: true }>(`/restaurants/${slug}`, { method: 'DELETE' }),
      discard: (slug: string) =>
        req<{ restaurant: Restaurant }>(`/restaurants/${slug}/discard`, { method: 'POST' }).then(r => r.restaurant)
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
      patch: (restaurantSlug: string, spaceId: string, body: Partial<Pick<Space, 'name' | 'type' | 'descriptor' | 'isDefault' | 'order' | 'coverGradient' | 'state' | 'hero' | 'manifesto' | 'schedule' | 'gallery' | 'scheduleTexts' | 'address' | 'mapUrl' | 'bookingContact'>>) =>
        req<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.space),
      delete: (restaurantSlug: string, spaceId: string) =>
        req<{ ok: true }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`, { method: 'DELETE' }),
      discard: (restaurantSlug: string, spaceId: string) =>
        req<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}/discard`, { method: 'POST' }).then(r => r.space)
    },

    // ─── Lectura pública ────────────────────────────────────────
    public: {
      /** Sin sesión. 404 si el restaurante no existe o no se ha publicado nunca. */
      site: (restaurantSlug: string) => req<PublishedSite>(`/public/restaurants/${restaurantSlug}`)
    },

    // ─── Tareas pendientes ──────────────────────────────────────
    /** Lo que le falta al contenido de un restaurante: publicación, horarios, traducciones y fotos. */
    pendingTasks: (restaurantSlug: string) =>
      req<{ tasks: PendingTask[] }>(`/restaurants/${restaurantSlug}/pending`).then(r => r.tasks),

    // ─── Estado de la web ──────────────────────────────────────
    /** ¿Enseña la web lo último publicado? */
    siteStatus: (restaurantSlug: string) =>
      req<{ site: SiteStatus }>(`/restaurants/${restaurantSlug}/site-status`).then(r => r.site),
    /** Pide regenerar la web a mano. */
    rebuildSite: (restaurantSlug: string) =>
      req<{ site: SiteStatus }>(`/restaurants/${restaurantSlug}/rebuild`, { method: 'POST' }).then(r => r.site),

    // ─── Legal pages ────────────────────────────────────────────
    legalPages: {
      list: (restaurantSlug: string) =>
        req<{ legalPages: LegalPage[] }>(`/restaurants/${restaurantSlug}/legal-pages`).then(r => r.legalPages),
      /** Crea la página o sustituye la que hubiera de ese tipo. */
      save: (restaurantSlug: string, type: LegalPageType, body: Pick<LegalPage, 'title' | 'content' | 'lastUpdated'>) =>
        req<{ legalPage: LegalPage }>(`/restaurants/${restaurantSlug}/legal-pages/${type}`, { method: 'PUT', body: JSON.stringify(body) }).then(r => r.legalPage),
      delete: (restaurantSlug: string, type: LegalPageType) =>
        req<{ ok: true }>(`/restaurants/${restaurantSlug}/legal-pages/${type}`, { method: 'DELETE' })
    },

    // ─── Dishes ─────────────────────────────────────────────────
    dishes: {
      /** Sin `kind` devuelve platos; con `kind: 'drink'`, bebidas. */
      list: (filters?: { restaurantSlug?: string; categoryId?: string; missingLocale?: string; kind?: DishKind }) =>
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
        list: (spaceId?: string, kind?: DishKind) =>
          req<{ categories: DishCategory[] }>(`/dishes/categories${buildQuery({ spaceId, kind })}`).then(r => r.categories),
        create: (body: { spaceId: string; name: I18nString; order?: number; kind?: DishKind }) =>
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
        patch: (id: string, body: { name?: I18nString; order?: number }) =>
          req<{ category: WineCategory }>(`/wines/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.category),
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
        email: string; password?: string; name: string; role?: 'admin' | 'editor';
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
      delete: (id: string) => req<{ ok: true }>(`/media/${id}`, { method: 'DELETE' }),
      references: (id: string) =>
        req<MediaReferences>(`/media/${id}/references`)
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
