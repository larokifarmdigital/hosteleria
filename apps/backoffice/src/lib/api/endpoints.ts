import { http } from '../http';
import type {
  Restaurant,
  Space,
  Dish,
  DishCategory,
  Wine,
  WineCategory,
  Language,
  I18nString,
  SessionUser
} from '@hosteleria/api-client';
import type { User, MediaAsset, UploadUrlResponse } from '@hosteleria/api-client';

/**
 * Funciones de red crudas — un wrapper fino sobre axios tipado por recurso.
 *
 * Devuelven el DTO directo (sin envoltorios `{restaurants: [...]}`). Los hooks
 * de TanStack Query las consumen; también podés llamarlas suelto desde una
 * acción puntual (ej. onClick de un botón que no amerita hook).
 */

// ─── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    http.post<{ user: SessionUser }>('/auth/login', { email, password }).then(r => r.data.user),
  logout: () => http.post<{ ok: true }>('/auth/logout').then(r => r.data),
  session: () =>
    http.get<{ user: SessionUser | null }>('/auth/session').then(r => r.data.user),
  forgot: (email: string) =>
    http.post<{ ok: true }>('/auth/forgot', { email }).then(r => r.data),
  reset: (token: string, password: string) =>
    http.post<{ ok: true }>('/auth/reset', { token, password }).then(r => r.data),
  setPassword: (token: string, password: string) =>
    http.post<{ ok: true }>('/auth/set-password', { token, password }).then(r => r.data)
};

// ─── Restaurants ──────────────────────────────────────────────────
export const restaurantsApi = {
  list: () =>
    http.get<{ restaurants: Restaurant[] }>('/restaurants').then(r => r.data.restaurants),
  get: (slug: string) =>
    http.get<{ restaurant: Restaurant }>(`/restaurants/${slug}`).then(r => r.data.restaurant),
  create: (body: {
    slug: string;
    name: string;
    domain: string;
    logoInitial?: string;
    defaultLocaleCode: string;
    activeLocaleCodes: string[];
  }) =>
    http.post<{ restaurant: Restaurant }>('/restaurants', body).then(r => r.data.restaurant),
  patch: (slug: string, body: Record<string, unknown>) =>
    http.patch<{ restaurant: Restaurant }>(`/restaurants/${slug}`, body).then(r => r.data.restaurant),
  delete: (slug: string) =>
    http.delete<{ ok: true }>(`/restaurants/${slug}`).then(r => r.data),
  publish: (slug: string) =>
    http.post<{ restaurant: Restaurant }>(`/restaurants/${slug}/publish`).then(r => r.data.restaurant),
  discard: (slug: string) =>
    http.post<{ restaurant: Restaurant }>(`/restaurants/${slug}/discard`).then(r => r.data.restaurant)
};

// ─── Spaces ───────────────────────────────────────────────────────
export const spacesApi = {
  list: (restaurantSlug: string) =>
    http.get<{ spaces: Space[] }>(`/restaurants/${restaurantSlug}/spaces`).then(r => r.data.spaces),
  get: (restaurantSlug: string, spaceId: string) =>
    http
      .get<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`)
      .then(r => r.data.space),
  create: (
    restaurantSlug: string,
    body: { slug: string; name: string; type?: Space['type']; descriptor?: string; isDefault?: boolean }
  ) =>
    http
      .post<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces`, body)
      .then(r => r.data.space),
  patch: (restaurantSlug: string, spaceId: string, body: Record<string, unknown>) =>
    http
      .patch<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`, body)
      .then(r => r.data.space),
  delete: (restaurantSlug: string, spaceId: string) =>
    http.delete<{ ok: true }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`).then(r => r.data)
};

// ─── Dishes ───────────────────────────────────────────────────────
export const dishesApi = {
  list: (filters?: { restaurantSlug?: string; categoryId?: string; missingLocale?: string }) =>
    http.get<{ dishes: Dish[] }>('/dishes', { params: filters }).then(r => r.data.dishes),
  get: (id: string) =>
    http.get<{ dish: Dish }>(`/dishes/${id}`).then(r => r.data.dish),
  create: (body: {
    spaceId: string;
    categoryId: string;
    name: I18nString;
    note?: I18nString;
    price?: number;
    order?: number;
    active?: boolean;
    imageAssetId?: string;
    imageGradient?: string;
  }) => http.post<{ dish: Dish }>('/dishes', body).then(r => r.data.dish),
  patch: (id: string, body: Record<string, unknown>) =>
    http.patch<{ dish: Dish }>(`/dishes/${id}`, body).then(r => r.data.dish),
  delete: (id: string) => http.delete<{ ok: true }>(`/dishes/${id}`).then(r => r.data),
  categories: {
    list: (spaceId?: string) =>
      http
        .get<{ categories: DishCategory[] }>('/dishes/categories', { params: { spaceId } })
        .then(r => r.data.categories),
    create: (body: { spaceId: string; name: I18nString; order?: number }) =>
      http
        .post<{ category: DishCategory }>('/dishes/categories', body)
        .then(r => r.data.category),
    patch: (id: string, body: { name?: I18nString; order?: number }) =>
      http
        .patch<{ category: DishCategory }>(`/dishes/categories/${id}`, body)
        .then(r => r.data.category),
    delete: (id: string) =>
      http.delete<{ ok: true }>(`/dishes/categories/${id}`).then(r => r.data)
  }
};

// ─── Wines ────────────────────────────────────────────────────────
export const winesApi = {
  list: (filters?: { restaurantSlug?: string; categoryId?: string }) =>
    http.get<{ wines: Wine[] }>('/wines', { params: filters }).then(r => r.data.wines),
  create: (body: {
    spaceId: string;
    categoryId: string;
    name: string;
    region?: string;
    note?: I18nString;
    priceGlass?: number;
    priceBottle?: number;
    order?: number;
    active?: boolean;
    imageGradient?: string;
  }) => http.post<{ wine: Wine }>('/wines', body).then(r => r.data.wine),
  patch: (id: string, body: Record<string, unknown>) =>
    http.patch<{ wine: Wine }>(`/wines/${id}`, body).then(r => r.data.wine),
  delete: (id: string) => http.delete<{ ok: true }>(`/wines/${id}`).then(r => r.data),
  categories: {
    list: (spaceId?: string) =>
      http
        .get<{ categories: WineCategory[] }>('/wines/categories', { params: { spaceId } })
        .then(r => r.data.categories),
    create: (body: { spaceId: string; name: I18nString; order?: number }) =>
      http.post<{ category: WineCategory }>('/wines/categories', body).then(r => r.data.category),
    delete: (id: string) =>
      http.delete<{ ok: true }>(`/wines/categories/${id}`).then(r => r.data)
  }
};

// ─── Languages ────────────────────────────────────────────────────
export const languagesApi = {
  list: () =>
    http.get<{ languages: Language[] }>('/languages').then(r => r.data.languages),
  create: (body: { code: string; name: string }) =>
    http.post<{ language: Language }>('/languages', body).then(r => r.data.language),
  patch: (id: string, body: { name?: string }) =>
    http.patch<{ language: Language }>(`/languages/${id}`, body).then(r => r.data.language),
  delete: (id: string) =>
    http.delete<{ ok: true }>(`/languages/${id}`).then(r => r.data)
};

// ─── Users ────────────────────────────────────────────────────────
export const usersApi = {
  list: () => http.get<{ users: User[] }>('/users').then(r => r.data.users),
  create: (body: {
    email: string;
    password?: string;
    name: string;
    role?: 'admin' | 'editor';
    avatarColor?: string;
    restaurantSlugs?: string[];
  }) => http.post<{ user: User }>('/users', body).then(r => r.data.user),
  patch: (
    id: string,
    body: {
      name?: string;
      role?: 'admin' | 'editor';
      avatarColor?: string;
      restaurantSlugs?: string[];
      password?: string;
    }
  ) => http.patch<{ user: User }>(`/users/${id}`, body).then(r => r.data.user),
  delete: (id: string) => http.delete<{ ok: true }>(`/users/${id}`).then(r => r.data)
};

// ─── Media ────────────────────────────────────────────────────────
export const mediaApi = {
  list: (filters?: { restaurantSlug?: string; usage?: string; missingAlt?: boolean }) =>
    http.get<{ media: MediaAsset[] }>('/media', { params: filters }).then(r => r.data.media),
  uploadUrl: (body: { restaurantSlug: string; filename: string; mimeType: string; sizeKb: number }) =>
    http.post<UploadUrlResponse>('/media/upload-url', body).then(r => r.data),
  confirm: (mediaId: string, body: { width?: number; height?: number; altText?: I18nString }) =>
    http.post<{ media: MediaAsset }>(`/media/${mediaId}/confirm`, body).then(r => r.data.media),
  patch: (
    id: string,
    body: { usage?: MediaAsset['usage']; hasAltText?: boolean; altText?: I18nString }
  ) => http.patch<{ media: MediaAsset }>(`/media/${id}`, body).then(r => r.data.media),
  delete: (id: string) => http.delete<{ ok: true }>(`/media/${id}`).then(r => r.data)
};
