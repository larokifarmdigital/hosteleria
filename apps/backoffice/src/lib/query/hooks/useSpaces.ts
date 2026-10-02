'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { spacesApi } from '../../api/endpoints';
import { qk } from '../keys';

export function useSpaces(restaurantSlug: string) {
  return useQuery({
    queryKey: qk.spaces.byRestaurant(restaurantSlug),
    queryFn: () => spacesApi.list(restaurantSlug),
    enabled: Boolean(restaurantSlug)
  });
}

export function useSpace(restaurantSlug: string, spaceId: string) {
  return useQuery({
    queryKey: qk.spaces.detail(restaurantSlug, spaceId),
    queryFn: () => spacesApi.get(restaurantSlug, spaceId),
    enabled: Boolean(restaurantSlug && spaceId)
  });
}

export function useCreateSpace(restaurantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof spacesApi.create>[1]) => spacesApi.create(restaurantSlug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(restaurantSlug) });
    }
  });
}

export function useUpdateSpace(restaurantSlug: string, spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => spacesApi.patch(restaurantSlug, spaceId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.spaces.detail(restaurantSlug, spaceId) });
      const previous = qc.getQueryData(qk.spaces.detail(restaurantSlug, spaceId));
      qc.setQueryData(qk.spaces.detail(restaurantSlug, spaceId), (old: any) => ({ ...old, ...body }));
      return { previous };
    },
    onError: (_e, _b, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.spaces.detail(restaurantSlug, spaceId), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.detail(restaurantSlug, spaceId) });
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
    }
  });
}

export function useDeleteSpace(restaurantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => spacesApi.delete(restaurantSlug, spaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(restaurantSlug) });
    }
  });
}
