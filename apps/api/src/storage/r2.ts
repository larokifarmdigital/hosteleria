import { AwsClient } from 'aws4fetch';
import type { Env } from '../env.js';

/**
 * Helpers de R2 para Cloudflare Workers.
 *
 * **Dos APIs conviven**:
 *
 *  1. **R2 binding nativo** (`env.MEDIA`) — para operaciones directas desde el
 *     Worker: `.head()`, `.delete()`, `.list()`. Rápido y sin firmar.
 *
 *  2. **aws4fetch con endpoint S3-compatible** — para generar **presigned PUT
 *     URLs**: el browser sube el binario directo a R2 (no pasa por el Worker,
 *     evita el límite de body size y gasto de CPU time). El R2 binding
 *     nativo NO soporta presigned URLs; hay que firmar manual con S3 API.
 *
 * Convención de keys: `{restaurantSlug}/{YYYY}/{filename}`.
 */

let _s3Client: AwsClient | null = null;

function getS3Client(env: Env): AwsClient {
  if (_s3Client) return _s3Client;
  _s3Client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto'
  });
  return _s3Client;
}

export interface UploadUrlOpts {
  env: Env;
  key: string;
  contentType: string;
  /** Segundos antes de que la URL firmada caduque. Default 300 (5 min). */
  expiresIn?: number;
}

/**
 * Genera una PUT URL firmada que permite al browser subir un archivo
 * directo al bucket R2 (el Worker nunca toca el binario — solo firma).
 *
 * Flujo cliente:
 *   1. Browser → POST /media/upload-url {filename, mimeType, sizeKb}
 *   2. Worker responde {uploadUrl, publicUrl, mediaId}
 *   3. Browser → PUT uploadUrl con el binario
 *   4. Browser → POST /media/:mediaId/confirm (registra en BD)
 *
 * Dónde se usa:
 *  - `routes/media.ts` → POST /media/upload-url.
 */
export async function createUploadUrl(opts: UploadUrlOpts) {
  const { env, key, contentType, expiresIn = 300 } = opts;
  const client = getS3Client(env);

  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`;
  const url = new URL(endpoint);
  url.searchParams.set('X-Amz-Expires', String(expiresIn));

  const signed = await client.sign(
    new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
    { aws: { signQuery: true } }
  );

  return {
    uploadUrl: signed.url,
    publicUrl: `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
    key,
    expiresIn
  };
}

/**
 * Borra un objeto del bucket. Idempotente — si no existe, no lanza.
 *
 * Dónde se usa:
 *  - `routes/media.ts` → DELETE /media/:id (borra asset + archivo).
 *  - `routes/media.ts` → cleanup si confirm falla tras subida parcial.
 */
export async function deleteObject(env: Env, key: string) {
  await env.MEDIA.delete(key);
}

/**
 * Metadata del objeto si existe en R2, o `null` si no.
 *
 * Dónde se usa:
 *  - `routes/media.ts` → POST /media/:id/confirm. Verifica que el browser
 *    realmente completó la subida antes de marcar el asset como "listo"
 *    en BD. Si el browser falló a mitad del PUT, aquí lo detectamos.
 */
export async function headObject(
  env: Env,
  key: string
): Promise<{ sizeBytes: number; contentType?: string } | null> {
  const obj = await env.MEDIA.head(key);
  if (!obj) return null;
  return {
    sizeBytes: obj.size,
    contentType: obj.httpMetadata?.contentType
  };
}

/**
 * Normaliza un nombre de archivo para usarlo como parte de la key en R2:
 *   "Foto Comedor 01 .JPG" → { name: "foto-comedor-01", extension: "jpg" }
 *
 * Dónde se usa:
 *  - `routes/media.ts` → POST /media/upload-url (construye la R2 key).
 */
export function normalizeFilename(input: string): { name: string; extension: string } {
  const dotIdx = input.lastIndexOf('.');
  const rawName = dotIdx > 0 ? input.slice(0, dotIdx) : input;
  const extension = (dotIdx > 0 ? input.slice(dotIdx + 1) : '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const name = rawName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return { name: name || 'file', extension: extension || 'bin' };
}
