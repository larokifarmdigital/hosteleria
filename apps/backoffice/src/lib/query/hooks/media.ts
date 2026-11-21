'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MediaUsage, I18nString } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import type { ImageSize } from '../../media/imageChecks';
import { uploadMedia } from '../../media/upload';
import { qk } from '../keys';

type ListFilters = { restaurantSlug?: string; usage?: string; missingAlt?: boolean };

export function useMediaList(filters?: ListFilters) {
  return useQuery({ queryKey: qk.media.list(filters), queryFn: () => api.media.list(filters) });
}

/** Sin toast de error: quien sube (`MediaUploader`) lo muestra junto al archivo, con «Reintentar». */
export function useMediaUpload(restaurantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { file: File; size?: ImageSize | null; onProgress?: (fraction: number) => void; signal?: AbortSignal }) =>
      uploadMedia(restaurantSlug, vars.file, { size: vars.size, onProgress: vars.onProgress, signal: vars.signal }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.all })
  });
}

export function usePatchMedia(id: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: { usage?: MediaUsage; hasAltText?: boolean; altText?: I18nString }) =>
      api.media.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.all }),
    onError: toastError
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.media.delete(id),
    // Solo los listados: el diálogo de borrado sigue abierto un instante con la
    // consulta de usos de esta foto, y refrescarla daría un 404.
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.lists() }),
    onError: toastError
  });
}

/** Sin caché: se consulta justo antes de borrar, y una respuesta antigua daría un aviso falso. */
export function useMediaReferences(id: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.media.detail(id), 'references'] as const,
    queryFn: () => api.media.references(id),
    enabled: opts?.enabled ?? Boolean(id),
    staleTime: 0,
    gcTime: 0
  });
}
