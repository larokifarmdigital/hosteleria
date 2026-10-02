'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Restaurant } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

type CreateInput = {
  slug: string;
  name: string;
  domain: string;
  logoInitial?: string;
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
};

type PatchInput = Partial<{
  name: string;
  domain: string;
  logoInitial: string;
  coverGradient: string;
  state: Restaurant['state'];
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
  acceptsBookings: boolean;
  showSocials: boolean;
  timezone: string;
  rebuildHookUrl: string | null;
  address: Restaurant['address'];
  contact: Restaurant['contact'];
  socials: Restaurant['socials'];
  seo: Restaurant['seo'];
}>;

// ─── Fetch functions ──────────────────────────────────────────────
const api = {
  list: () => http.get<{ restaurants: Restaurant[] }>('/restaurants').then(r => r.data.restaurants),
  get: (slug: string) =>
    http.get<{ restaurant: Restaurant }>(`/restaurants/${slug}`).then(r => r.data.restaurant),
  create: (body: CreateInput) =>
    http.post<{ restaurant: Restaurant }>('/restaurants', body).then(r => r.data.restaurant),
  patch: (slug: string, body: PatchInput) =>
    http.patch<{ restaurant: Restaurant }>(`/restaurants/${slug}`, body).then(r => r.data.restaurant),
  delete: (slug: string) =>
    http.delete<{ ok: true }>(`/restaurants/${slug}`).then(r => r.data),
  publish: (slug: string) =>
    http.post<{ restaurant: Restaurant }>(`/restaurants/${slug}/publish`).then(r => r.data.restaurant),
  discard: (slug: string) =>
    http.post<{ restaurant: Restaurant }>(`/restaurants/${slug}/discard`).then(r => r.data.restaurant)
};

// ─── Hooks ────────────────────────────────────────────────────────
export function useRestaurants() {
  return useQuery({ queryKey: qk.restaurants.list(), queryFn: api.list });
}

export function useRestaurant(slug: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.restaurants.detail(slug),
    queryFn: () => api.get(slug),
    enabled: opts?.enabled ?? Boolean(slug)
  });
}

export function useCreateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.restaurants.lists() })
  });
}

/** Patch con optimistic update + revert en error. */
export function usePatchRestaurant(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchInput) => api.patch(slug, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.restaurants.detail(slug) });
      const prev = qc.getQueryData<Restaurant>(qk.restaurants.detail(slug));
      qc.setQueryData<Restaurant>(qk.restaurants.detail(slug), (old) =>
        old ? { ...old, ...body } : old
      );
      return { prev };
    },
    onError: (_e, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.restaurants.detail(slug), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(slug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    }
  });
}

export function useDeleteRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.delete(slug),
    onSuccess: (_data, slug) => {
      qc.removeQueries({ queryKey: qk.restaurants.detail(slug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    }
  });
}

export function usePublishRestaurant(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.publish(slug),
    onSuccess: (restaurant) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    }
  });
}

export function useDiscardRestaurant(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.discard(slug),
    onSuccess: (restaurant) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
    }
  });
}
