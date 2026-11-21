'use client';

import type { MediaAsset } from '@hosteleria/api-client';
import { api } from '../api/browser';
import type { ImageSize } from './imageChecks';

interface Options {
  size?: ImageSize | null;
  /** Fracción subida, de 0 a 1. */
  onProgress?: (fraction: number) => void;
  /** Cancela la subida en curso; lo ya creado en el api se limpia. */
  signal?: AbortSignal;
}

/** Pide la URL firmada, sube el archivo directo a R2 y lo confirma en el api. */
export async function uploadMedia(restaurantSlug: string, file: File, { size, onProgress, signal }: Options = {}): Promise<MediaAsset> {
  const { uploadUrl, mediaId } = await api.media.uploadUrl({
    restaurantSlug,
    filename: file.name,
    mimeType: file.type,
    sizeKb: Math.ceil(file.size / 1024)
  });

  try {
    await putWithProgress(uploadUrl, file, onProgress, signal);
  } catch (err) {
    // El api ya creó la fila al dar la URL: sin esto quedaría en la lista una foto que no existe.
    await api.media.delete(mediaId).catch(() => undefined);
    throw err;
  }

  return api.media.confirm(mediaId, size ? { width: size.width, height: size.height } : {});
}

// XMLHttpRequest y no `fetch`: `fetch` no informa del progreso de subida.
// Va sin cookie ni cabeceras propias, que R2 rechazaría.
function putWithProgress(url: string, file: File, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const failure = new Error('No se ha podido subir la foto. Comprueba la conexión y vuelve a intentarlo.');
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(failure));
    xhr.onerror = () => reject(failure);
    xhr.onabort = () => reject(failure);
    if (signal?.aborted) return reject(failure);
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
