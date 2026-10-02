'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Space } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

type CreateInput = {
  slug: string;
  name: string;
  type?: Space['type'];
  descriptor?: string;
  isDefault?: boolean;
};

type PatchInput = Partial<
  Pick<Space, 'name' | 'type' | 'descriptor' | 'isDefault' | 'order' | 'coverGradient' | 'state' | 'hero' | 'manifesto' | 'schedule'>
>;

const api = {
  list: (restaurantSlug: string) =>
    http.get<{ spaces: Space[] }>(`/restaurants/${restaurantSlug}/spaces`).then(r => r.data.spaces),
  get: (restaurantSlug: string, spaceId: string) =>
    http
      .get<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`)
      .then(r => r.data.space),
  create: (restaurantSlug: string, body: CreateInput) =>
    http
      .post<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces`, body)
      .then(r => r.data.space),
  patch: (restaurantSlug: string, spaceId: string, body: PatchInput) =>
    http
      .patch<{ space: Space }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`, body)
      .then(r => r.data.space),
  delete: (restaurantSlug: string, spaceId: string) =>
    http.delete<{ ok: true }>(`/restaurants/${restaurantSlug}/spaces/${spaceId}`).then(r => r.data)
};

export function useSpaces(restaurantSlug: string) {
  return useQuery({
    queryKey: qk.spaces.byRestaurant(restaurantSlug),
    queryFn: () => api.list(restaurantSlug),
    enabled: Boolean(restaurantSlug)
  });
}

export function useSpace(restaurantSlug: string, spaceId: string) {
  return useQuery({
    queryKey: qk.spaces.detail(restaurantSlug, spaceId),
    queryFn: () => api.get(restaurantSlug, spaceId),
    enabled: Boolean(restaurantSlug && spaceId)
  });
}

export function useCreateSpace(restaurantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInput) => api.create(restaurantSlug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(restaurantSlug) });
    }
  });
}

export function usePatchSpace(restaurantSlug: string, spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchInput) => api.patch(restaurantSlug, spaceId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.spaces.detail(restaurantSlug, spaceId) });
      const prev = qc.getQueryData<Space>(qk.spaces.detail(restaurantSlug, spaceId));
      qc.setQueryData<Space>(qk.spaces.detail(restaurantSlug, spaceId), (old) =>
        old ? { ...old, ...body } : old
      );
      return { prev };
    },
    onError: (_e, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.spaces.detail(restaurantSlug, spaceId), ctx.prev);
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
    mutationFn: (spaceId: string) => api.delete(restaurantSlug, spaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces.byRestaurant(restaurantSlug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.detail(restaurantSlug) });
    }
  });
}
