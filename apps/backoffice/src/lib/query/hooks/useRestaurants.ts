'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { restaurantsApi } from '../../api/endpoints';
import { qk } from '../keys';

/** Lista de restaurantes para el dashboard y navegación. */
export function useRestaurants() {
  return useQuery({
    queryKey: qk.restaurants.list(),
    queryFn: () => restaurantsApi.list()
  });
}

/** Un restaurante por slug — para la pantalla de edición. */
export function useRestaurant(slug: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.restaurants.detail(slug),
    queryFn: () => restaurantsApi.get(slug),
    enabled: opts?.enabled ?? Boolean(slug)
  });
}

export function useCreateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restaurantsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    }
  });
}

/**
 * Patch con optimistic update: actualiza la cache del detalle antes de
 * esperar la respuesta del server. En error, revierte al snapshot previo.
 */
export function useUpdateRestaurant(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => restaurantsApi.patch(slug, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.restaurants.detail(slug) });
      const previous = qc.getQueryData(qk.restaurants.detail(slug));
      qc.setQueryData(qk.restaurants.detail(slug), (old: any) => ({ ...old, ...body }));
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.restaurants.detail(slug), ctx.previous);
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
    mutationFn: (slug: string) => restaurantsApi.delete(slug),
    onSuccess: (_data, slug) => {
      qc.removeQueries({ queryKey: qk.restaurants.detail(slug) });
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    }
  });
}

export function usePublishRestaurant(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => restaurantsApi.publish(slug),
    onSuccess: (restaurant) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
    }
  });
}

export function useDiscardRestaurant(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => restaurantsApi.discard(slug),
    onSuccess: (restaurant) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
    }
  });
}
