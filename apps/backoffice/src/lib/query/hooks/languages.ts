'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Language } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

const api = {
  list: () => http.get<{ languages: Language[] }>('/languages').then(r => r.data.languages),
  create: (body: { code: string; name: string }) =>
    http.post<{ language: Language }>('/languages', body).then(r => r.data.language),
  patch: (id: string, body: { name?: string }) =>
    http.patch<{ language: Language }>(`/languages/${id}`, body).then(r => r.data.language),
  delete: (id: string) => http.delete<{ ok: true }>(`/languages/${id}`).then(r => r.data)
};

/** Idiomas globales — cambian poco, staleTime largo. */
export function useLanguages() {
  return useQuery({
    queryKey: qk.languages.list(),
    queryFn: api.list,
    staleTime: 10 * 60_000
  });
}

export function useCreateLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all })
  });
}

export function usePatchLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string } }) => api.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all })
  });
}

export function useDeleteLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all })
  });
}
