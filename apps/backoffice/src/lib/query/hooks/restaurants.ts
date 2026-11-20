'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Restaurant, ApiClient } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

type CreateInput = Parameters<ApiClient['restaurants']['create']>[0];
type PatchInput = Parameters<ApiClient['restaurants']['patch']>[1];

export function useRestaurants() {
  return useQuery({ queryKey: qk.restaurants.list(), queryFn: api.restaurants.list });
}

export function useRestaurant(slug: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.restaurants.detail(slug),
    queryFn: () => api.restaurants.get(slug),
    enabled: opts?.enabled ?? Boolean(slug)
  });
}

export function useCreateRestaurant() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: CreateInput) => api.restaurants.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.restaurants.lists() }),
    onError: toastError
  });
}

/** Patch con optimistic update + revert en error. Toast automático en error. */
export function usePatchRestaurant(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: PatchInput) => api.restaurants.patch(slug, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.restaurants.detail(slug) });
      const prev = qc.getQueryData<Restaurant>(qk.restaurants.detail(slug));
      qc.setQueryData<Restaurant>(qk.restaurants.detail(slug), (old) =>
        old ? { ...old, ...body } as Restaurant : old
      );
      return { prev };
    },
    onError: (err, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.restaurants.detail(slug), ctx.prev);
      toastError(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(slug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    }
  });
}

export function useDeleteRestaurant() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (slug: string) => api.restaurants.delete(slug),
    onSuccess: (_data, slug) => {
      qc.removeQueries({ queryKey: qk.restaurants.detail(slug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    },
    onError: toastError
  });
}

/** Publicar = patch con `state: 'published'`. El backend crea el snapshot y dispara el rebuild hook. */
export function usePublishRestaurant(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.restaurants.patch(slug, { state: 'published' }),
    onSuccess: (restaurant) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    },
    onError: toastError
  });
}

export function useDiscardRestaurant(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.restaurants.discard(slug),
    onSuccess: (restaurant) => qc.setQueryData(qk.restaurants.detail(slug), restaurant),
    onError: toastError
  });
}

// ─── Prefetch para RSC ────────────────────────────────────────────
export async function prefetchRestaurants(qc: QueryClient, serverApi: ApiClient) {
  await qc.prefetchQuery({ queryKey: qk.restaurants.list(), queryFn: serverApi.restaurants.list });
}

export async function prefetchRestaurant(qc: QueryClient, serverApi: ApiClient, slug: string) {
  await qc.prefetchQuery({
    queryKey: qk.restaurants.detail(slug),
    queryFn: () => serverApi.restaurants.get(slug)
  });
}
