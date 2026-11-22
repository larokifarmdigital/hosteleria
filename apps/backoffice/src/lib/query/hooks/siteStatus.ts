'use client';

import { useEffect, useRef } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

/**
 * ¿Enseña la web lo último publicado? Se vuelve a preguntar al terminar cualquier
 * guardado de la pantalla y, mientras la web se está actualizando, cada 15 s.
 */
export function useSiteStatus(restaurantSlug: string) {
  const query = useQuery({
    queryKey: qk.siteStatus.byRestaurant(restaurantSlug),
    queryFn: () => api.siteStatus(restaurantSlug),
    enabled: Boolean(restaurantSlug),
    staleTime: 0,
    refetchInterval: q => (q.state.data?.state === 'updating' ? 15_000 : false)
  });
  const { refetch } = query;
  const saving = useIsMutating() > 0;
  const wasSaving = useRef(false);
  useEffect(() => {
    if (saving) { wasSaving.current = true; return; }
    if (!wasSaving.current || !restaurantSlug) return;
    wasSaving.current = false;
    // El aviso a la web sale al guardar: se espera un momento antes de mirar.
    const timer = setTimeout(() => { void refetch(); }, 1500);
    return () => clearTimeout(timer);
  }, [saving, restaurantSlug, refetch]);
  return query;
}

export function useRebuildSite(restaurantSlug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: () => api.rebuildSite(restaurantSlug),
    onSuccess: site => qc.setQueryData(qk.siteStatus.byRestaurant(restaurantSlug), site),
    onError: toastError
  });
}
