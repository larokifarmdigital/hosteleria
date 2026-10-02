'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { languagesApi } from '../../api/endpoints';
import { qk } from '../keys';

/** Idiomas globales — cambian poco, cache larga. */
export function useLanguages() {
  return useQuery({
    queryKey: qk.languages.list(),
    queryFn: () => languagesApi.list(),
    staleTime: 10 * 60_000
  });
}

export function useCreateLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: languagesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all })
  });
}

export function useUpdateLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string } }) => languagesApi.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all })
  });
}

export function useDeleteLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => languagesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.languages.all })
  });
}
