'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Space, ApiClient } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

type CreateInput = Parameters<ApiClient['spaces']['create']>[1];
type PatchInput = Parameters<ApiClient['spaces']['patch']>[2];

export function useSpaces(restaurantSlug: string) {
  return useQuery({
    queryKey: qk.spaces.byRestaurant(restaurantSlug),
    queryFn: () => api.spaces.list(restaurantSlug),
    enabled: Boolean(restaurantSlug)
  });
}

export function useSpace(restaurantSlug: string, spaceId: string) {
  return useQuery({
    queryKey: qk.spaces.detail(restaurantSlug, spaceId),
    queryFn: () => api.spaces.get(restaurantSlug, spaceId),
    enabled: Boolean(restaurantSlug && spaceId)
  });
}

export function useCreateSpace(restaurantSlug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: CreateInput) => api.spaces.create(restaurantSlug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(restaurantSlug) });
    },
    onError: toastError
  });
}

export function usePatchSpace(restaurantSlug: string, spaceId: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: PatchInput) => api.spaces.patch(restaurantSlug, spaceId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.spaces.detail(restaurantSlug, spaceId) });
      const prev = qc.getQueryData<Space>(qk.spaces.detail(restaurantSlug, spaceId));
      qc.setQueryData<Space>(qk.spaces.detail(restaurantSlug, spaceId), (old) =>
        old ? { ...old, ...body } as Space : old
      );
      return { prev };
    },
    onError: (err, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.spaces.detail(restaurantSlug, spaceId), ctx.prev);
      toastError(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.detail(restaurantSlug, spaceId) });
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
    }
  });
}

export function useDiscardSpace(restaurantSlug: string, spaceId: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.spaces.discard(restaurantSlug, spaceId),
    onSuccess: (space) => qc.setQueryData(qk.spaces.detail(restaurantSlug, spaceId), space),
    onError: toastError
  });
}

export function useDeleteSpace(restaurantSlug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (spaceId: string) => api.spaces.delete(restaurantSlug, spaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(restaurantSlug) });
    },
    onError: toastError
  });
}

export async function prefetchSpaces(qc: QueryClient, serverApi: ApiClient, restaurantSlug: string) {
  await qc.prefetchQuery({
    queryKey: qk.spaces.byRestaurant(restaurantSlug),
    queryFn: () => serverApi.spaces.list(restaurantSlug)
  });
}

export async function prefetchSpace(qc: QueryClient, serverApi: ApiClient, restaurantSlug: string, spaceId: string) {
  await qc.prefetchQuery({
    queryKey: qk.spaces.detail(restaurantSlug, spaceId),
    queryFn: () => serverApi.spaces.get(restaurantSlug, spaceId)
  });
}
