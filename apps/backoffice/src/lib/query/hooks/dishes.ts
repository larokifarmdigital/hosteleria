'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dish, ApiClient, I18nString } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

type ListFilters = { restaurantSlug?: string; categoryId?: string; missingLocale?: string };
type CreateInput = Parameters<ApiClient['dishes']['create']>[0];
type PatchInput = Parameters<ApiClient['dishes']['patch']>[1];

export function useDishes(filters?: ListFilters) {
  return useQuery({ queryKey: qk.dishes.list(filters), queryFn: () => api.dishes.list(filters) });
}

export function useDish(id: string) {
  return useQuery({
    queryKey: qk.dishes.detail(id),
    queryFn: () => api.dishes.get(id),
    enabled: Boolean(id)
  });
}

export function useCreateDish() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: CreateInput) => api.dishes.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes.all }),
    onError: toastError
  });
}

export function usePatchDish(id: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: PatchInput) => api.dishes.patch(id, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.dishes.detail(id) });
      const prev = qc.getQueryData<Dish>(qk.dishes.detail(id));
      qc.setQueryData<Dish>(qk.dishes.detail(id), (old) =>
        old ? { ...old, ...body } as Dish : old
      );
      return { prev };
    },
    onError: (err, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.dishes.detail(id), ctx.prev);
      toastError(err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.dishes.all })
  });
}

export function useDeleteDish() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.dishes.delete(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.dishes.detail(id) });
      qc.invalidateQueries({ queryKey: qk.dishes.all });
    },
    onError: toastError
  });
}

export function useDishCategories(spaceId?: string) {
  return useQuery({ queryKey: qk.dishes.categories(spaceId), queryFn: () => api.dishes.categories.list(spaceId) });
}

export function useCreateDishCategory() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: { spaceId: string; name: I18nString; order?: number }) =>
      api.dishes.categories.create(body),
    onSuccess: (_c, vars) => qc.invalidateQueries({ queryKey: qk.dishes.categories(vars.spaceId) }),
    onError: toastError
  });
}

export function usePatchDishCategory() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: I18nString; order?: number } }) =>
      api.dishes.categories.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes.all }),
    onError: toastError
  });
}

export function useDeleteDishCategory() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.dishes.categories.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes.all }),
    onError: toastError
  });
}
