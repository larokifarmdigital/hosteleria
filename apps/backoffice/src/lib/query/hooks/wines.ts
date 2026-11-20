'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient, I18nString } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

type ListFilters = { restaurantSlug?: string; categoryId?: string };
type CreateInput = Parameters<ApiClient['wines']['create']>[0];
type PatchInput = Parameters<ApiClient['wines']['patch']>[1];

export function useWines(filters?: ListFilters) {
  return useQuery({ queryKey: qk.wines.list(filters), queryFn: () => api.wines.list(filters) });
}

export function useCreateWine() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: CreateInput) => api.wines.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all }),
    onError: toastError
  });
}

export function usePatchWine(id: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: PatchInput) => api.wines.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all }),
    onError: toastError
  });
}

export function useDeleteWine() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.wines.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all }),
    onError: toastError
  });
}

export function useWineCategories(spaceId?: string) {
  return useQuery({ queryKey: qk.wines.categories(spaceId), queryFn: () => api.wines.categories.list(spaceId) });
}

export function useCreateWineCategory() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: { spaceId: string; name: I18nString; order?: number }) =>
      api.wines.categories.create(body),
    onSuccess: (_c, vars) => qc.invalidateQueries({ queryKey: qk.wines.categories(vars.spaceId) }),
    onError: toastError
  });
}

export function useDeleteWineCategory() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.wines.categories.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all }),
    onError: toastError
  });
}
