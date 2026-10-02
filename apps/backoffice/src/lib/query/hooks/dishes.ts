'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Dish, DishCategory, I18nString } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

type ListFilters = { restaurantSlug?: string; categoryId?: string; missingLocale?: string };

type CreateInput = {
  spaceId: string;
  categoryId: string;
  name: I18nString;
  note?: I18nString;
  price?: number;
  order?: number;
  active?: boolean;
  imageAssetId?: string;
  imageGradient?: string;
};

type PatchInput = Partial<Omit<CreateInput, 'spaceId'>>;

const api = {
  list: (filters?: ListFilters) =>
    http.get<{ dishes: Dish[] }>('/dishes', { params: filters }).then(r => r.data.dishes),
  get: (id: string) => http.get<{ dish: Dish }>(`/dishes/${id}`).then(r => r.data.dish),
  create: (body: CreateInput) =>
    http.post<{ dish: Dish }>('/dishes', body).then(r => r.data.dish),
  patch: (id: string, body: PatchInput) =>
    http.patch<{ dish: Dish }>(`/dishes/${id}`, body).then(r => r.data.dish),
  delete: (id: string) => http.delete<{ ok: true }>(`/dishes/${id}`).then(r => r.data),
  categories: {
    list: (spaceId?: string) =>
      http
        .get<{ categories: DishCategory[] }>('/dishes/categories', { params: { spaceId } })
        .then(r => r.data.categories),
    create: (body: { spaceId: string; name: I18nString; order?: number }) =>
      http.post<{ category: DishCategory }>('/dishes/categories', body).then(r => r.data.category),
    patch: (id: string, body: { name?: I18nString; order?: number }) =>
      http.patch<{ category: DishCategory }>(`/dishes/categories/${id}`, body).then(r => r.data.category),
    delete: (id: string) =>
      http.delete<{ ok: true }>(`/dishes/categories/${id}`).then(r => r.data)
  }
};

export function useDishes(filters?: ListFilters) {
  return useQuery({ queryKey: qk.dishes.list(filters), queryFn: () => api.list(filters) });
}

export function useDish(id: string) {
  return useQuery({
    queryKey: qk.dishes.detail(id),
    queryFn: () => api.get(id),
    enabled: Boolean(id)
  });
}

export function useCreateDish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes.all })
  });
}

export function usePatchDish(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchInput) => api.patch(id, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.dishes.detail(id) });
      const prev = qc.getQueryData<Dish>(qk.dishes.detail(id));
      qc.setQueryData<Dish>(qk.dishes.detail(id), (old) => (old ? { ...old, ...body } : old));
      return { prev };
    },
    onError: (_e, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.dishes.detail(id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.dishes.all })
  });
}

export function useDeleteDish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.dishes.detail(id) });
      qc.invalidateQueries({ queryKey: qk.dishes.all });
    }
  });
}

// ─── Categories ──────────────────────────────────────────────────
export function useDishCategories(spaceId?: string) {
  return useQuery({
    queryKey: qk.dishes.categories(spaceId),
    queryFn: () => api.categories.list(spaceId)
  });
}

export function useCreateDishCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.categories.create,
    onSuccess: (_c, vars) => qc.invalidateQueries({ queryKey: qk.dishes.categories(vars.spaceId) })
  });
}

export function usePatchDishCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: I18nString; order?: number } }) =>
      api.categories.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes.all })
  });
}

export function useDeleteDishCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes.all })
  });
}
