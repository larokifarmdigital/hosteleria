'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { MediaUsage, I18nString, ApiClient } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

type ListFilters = { restaurantSlug?: string; usage?: string; missingAlt?: boolean };

export function useMediaList(filters?: ListFilters) {
  return useQuery({ queryKey: qk.media.list(filters), queryFn: () => api.media.list(filters) });
}

/** El PUT a R2 usa `fetch` crudo: R2 no acepta la cookie de sesión ni el
 *  `X-Trace-Id`, y su respuesta no debe pasar por el `onError` del client. */
export function useMediaUpload(restaurantSlug: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async (vars: { file: File; altText?: I18nString }) => {
      const { file, altText } = vars;
      const { uploadUrl, mediaId } = await api.media.uploadUrl({
        restaurantSlug,
        filename: file.name,
        mimeType: file.type,
        sizeKb: Math.ceil(file.size / 1024)
      });

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      if (!putRes.ok) throw new Error(`No se pudo subir el archivo a R2 (${putRes.status}).`);

      const dims = await extractImageDimensions(file).catch(() => undefined);
      return api.media.confirm(mediaId, { ...dims, altText });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.all }),
    onError: toastError
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
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.all }),
    onError: toastError
  });
}

export function useMediaReferences(id: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.media.detail(id), 'references'] as const,
    queryFn: () => api.media.references(id),
    enabled: opts?.enabled ?? Boolean(id)
  });
}

export async function prefetchMedia(qc: QueryClient, serverApi: ApiClient, filters?: ListFilters) {
  await qc.prefetchQuery({
    queryKey: qk.media.list(filters),
    queryFn: () => serverApi.media.list(filters)
  });
}

function extractImageDimensions(file: File): Promise<{ width: number; height: number } | undefined> {
  if (!file.type.startsWith('image/')) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    img.src = url;
  });
}
