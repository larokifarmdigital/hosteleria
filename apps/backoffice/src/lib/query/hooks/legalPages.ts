'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LegalPage, LegalPageType } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

export function useLegalPages(restaurantSlug: string) {
  return useQuery({
    queryKey: qk.legalPages.byRestaurant(restaurantSlug),
    queryFn: () => api.legalPages.list(restaurantSlug),
    enabled: Boolean(restaurantSlug)
  });
}

export function useSaveLegalPage(restaurantSlug: string, type: LegalPageType) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: Pick<LegalPage, 'title' | 'content' | 'lastUpdated'>) => api.legalPages.save(restaurantSlug, type, body),
    onSuccess: saved => {
      qc.setQueryData<LegalPage[]>(qk.legalPages.byRestaurant(restaurantSlug), old => [...(old ?? []).filter(p => p.type !== type), saved]);
    },
    onError: toastError
  });
}

export function useDeleteLegalPage(restaurantSlug: string, type: LegalPageType) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.legalPages.delete(restaurantSlug, type),
    onSuccess: () => {
      qc.setQueryData<LegalPage[]>(qk.legalPages.byRestaurant(restaurantSlug), old => (old ?? []).filter(p => p.type !== type));
    },
    onError: toastError
  });
}
