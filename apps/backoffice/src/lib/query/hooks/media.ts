'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MediaAsset, MediaUsage, UploadUrlResponse, I18nString } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

type ListFilters = { restaurantSlug?: string; usage?: string; missingAlt?: boolean };

const api = {
  list: (filters?: ListFilters) =>
    http.get<{ media: MediaAsset[] }>('/media', { params: filters }).then(r => r.data.media),
  uploadUrl: (body: { restaurantSlug: string; filename: string; mimeType: string; sizeKb: number }) =>
    http.post<UploadUrlResponse>('/media/upload-url', body).then(r => r.data),
  confirm: (mediaId: string, body: { width?: number; height?: number; altText?: I18nString }) =>
    http.post<{ media: MediaAsset }>(`/media/${mediaId}/confirm`, body).then(r => r.data.media),
  patch: (id: string, body: { usage?: MediaUsage; hasAltText?: boolean; altText?: I18nString }) =>
    http.patch<{ media: MediaAsset }>(`/media/${id}`, body).then(r => r.data.media),
  delete: (id: string) => http.delete<{ ok: true }>(`/media/${id}`).then(r => r.data)
};

export function useMediaList(filters?: ListFilters) {
  return useQuery({ queryKey: qk.media.list(filters), queryFn: () => api.list(filters) });
}

/**
 * Upload directo browser → R2 en 2 pasos:
 *   1. POST /media/upload-url → firma signed URL
 *   2. PUT a R2 con el binario (no pasa por el api)
 *   3. POST /media/:id/confirm → registra el asset en BD
 *
 * Devuelve un helper `upload(file)` que corre el flujo completo.
 */
export function useMediaUpload(restaurantSlug: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { file: File; altText?: I18nString }) => {
      const { file, altText } = vars;
      const { uploadUrl, mediaId } = await api.uploadUrl({
        restaurantSlug,
        filename: file.name,
        mimeType: file.type,
        sizeKb: Math.ceil(file.size / 1024)
      });

      // PUT directo a R2 (no usa `http` → no interceptors, no cookie).
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      if (!putRes.ok) throw new Error(`r2_upload_failed_${putRes.status}`);

      // Si es imagen, extraer width/height para pasar al confirm.
      const dims = await extractImageDimensions(file).catch(() => undefined);

      return api.confirm(mediaId, { ...dims, altText });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.all })
  });
}

export function usePatchMedia(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { usage?: MediaUsage; hasAltText?: boolean; altText?: I18nString }) =>
      api.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.all })
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.media.all })
  });
}

// ─── Helpers ──────────────────────────────────────────────────────
function extractImageDimensions(file: File): Promise<{ width: number; height: number } | undefined> {
  if (!file.type.startsWith('image/')) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    img.src = url;
  });
}
