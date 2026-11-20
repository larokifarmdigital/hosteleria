'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

/** Idiomas globales — cambian poco, staleTime largo. */
export function useLanguages() {
  return useQuery({ queryKey: qk.languages.list(), queryFn: api.languages.list, staleTime: 10 * 60_000 });
}

export function useCreateLanguage() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: { code: string; name: string }) => api.languages.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all }),
    onError: toastError
  });
}

export function usePatchLanguage() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string } }) => api.languages.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all }),
    onError: toastError
  });
}

export function useDeleteLanguage() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.languages.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all }),
    onError: toastError
  });
}

export async function prefetchLanguages(qc: QueryClient, serverApi: ApiClient) {
  await qc.prefetchQuery({ queryKey: qk.languages.list(), queryFn: serverApi.languages.list });
}
