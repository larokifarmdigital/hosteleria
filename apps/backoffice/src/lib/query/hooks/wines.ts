'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Wine, WineCategory, I18nString } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

type ListFilters = { restaurantSlug?: string; categoryId?: string };

type CreateInput = {
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
};

type PatchInput = Partial<Omit<CreateInput, 'spaceId'>>;

const api = {
  list: (filters?: ListFilters) =>
    http.get<{ wines: Wine[] }>('/wines', { params: filters }).then(r => r.data.wines),
  create: (body: CreateInput) =>
    http.post<{ wine: Wine }>('/wines', body).then(r => r.data.wine),
  patch: (id: string, body: PatchInput) =>
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

export function useWines(filters?: ListFilters) {
  return useQuery({ queryKey: qk.wines.list(filters), queryFn: () => api.list(filters) });
}

export function useCreateWine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all })
  });
}

export function usePatchWine(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchInput) => api.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all })
  });
}

export function useDeleteWine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all })
  });
}

// ─── Categories ──────────────────────────────────────────────────
export function useWineCategories(spaceId?: string) {
  return useQuery({
    queryKey: qk.wines.categories(spaceId),
    queryFn: () => api.categories.list(spaceId)
  });
}

export function useCreateWineCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.categories.create,
    onSuccess: (_c, vars) => qc.invalidateQueries({ queryKey: qk.wines.categories(vars.spaceId) })
  });
}

export function useDeleteWineCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all })
  });
}
