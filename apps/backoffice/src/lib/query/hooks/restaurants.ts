'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Restaurant, ApiClient, SiteChanges } from '@hosteleria/api-client';
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

export function usePatchRestaurant(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    meta: { keepsSiteChanges: true },
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

/** Al pasar a `published`, el backend crea el snapshot y dispara el rebuild. */
/** Publica la ficha y todos los espacios con cambios: la web entera de una vez. */
export function usePublishAll(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.restaurants.publishAll(slug),
    onSuccess: ({ restaurant }) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
      // Los espacios publicados cambian de estado y de snapshot, estén o no en pantalla.
      qc.invalidateQueries({ queryKey: qk.spaces.all });
      qc.invalidateQueries({ queryKey: qk.pendingTasks.all });
      qc.invalidateQueries({ queryKey: qk.siteStatus.all });
    },
    onError: toastError
  });
}

export function useDiscardRestaurant(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.restaurants.discard(slug),
    onSuccess: (restaurant) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
      qc.invalidateQueries({ queryKey: qk.restaurants.lists() });
      // Lo que queda por publicar cambia: la barra del editor lo vuelve a preguntar.
      qc.invalidateQueries({ queryKey: qk.pendingTasks.all });
    },
    onError: toastError
  });
}

/** Qué ha cambiado desde el último «Publicar» en carta, vinos, legales y espacios. */
export function useSiteChanges(slug: string) {
  return useQuery<SiteChanges>({
    queryKey: qk.siteChanges.byRestaurant(slug),
    queryFn: () => api.restaurants.changes(slug),
    staleTime: 0
  });
}

/** «Recuperar» un plato, bebida o vino borrado que sigue en la web. */
export function useRestorePublishedRow(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: { kind: 'dish' | 'wine'; id: string }) => api.restaurants.restore(slug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.dishes.all });
      qc.invalidateQueries({ queryKey: qk.wines.all });
    },
    onError: toastError
  });
}

/** Descartar todo: el backoffice vuelve a ser la web publicada. */
export function useDiscardAll(slug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.restaurants.discardAll(slug),
    onSuccess: (restaurant) => {
      qc.setQueryData(qk.restaurants.detail(slug), restaurant);
      // Cambian la ficha, los espacios, la carta y los legales: se vuelve a pedir todo.
      qc.invalidateQueries();
    },
    onError: toastError
  });
}
