import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../env';

/**
 * R2 helpers. Cloudflare R2 es compatible S3, así que usamos el SDK
 * oficial de AWS con el endpoint apuntando a Cloudflare.
 *
 * Convención de keys: {restaurantSlug}/{YYYY}/{filename}
 *  - restaurantSlug agrupa
 *  - año permite listar por temporada / archivar
 *  - filename lleva un cuid para evitar colisiones
 */
let _s3: S3Client | null = null;

export function getS3(env: Env): S3Client {
  if (_s3) return _s3;
  _s3 = new S3Client({
    region: 'auto', // R2 exige 'auto'
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY
    },
    // R2 NO soporta virtual-hosted style con el bucket en el subdomain.
    // Hay que forzar path-style para que las requests sean
    // https://ACCOUNT.r2.cloudflarestorage.com/BUCKET/KEY
    // en vez de https://BUCKET.ACCOUNT.r2.cloudflarestorage.com/KEY (que no resuelve).
    forcePathStyle: true
  });
  return _s3;
}

export interface UploadUrlOpts {
  env: Env;
  key: string;
  contentType: string;
  expiresIn?: number; // seconds
}

/** Genera una PUT URL firmada para subir un objeto directamente al bucket. */
export async function createUploadUrl({ env, key, contentType, expiresIn = 300 }: UploadUrlOpts) {
  const s3 = getS3(env);
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  return { uploadUrl, publicUrl, key, expiresIn };
}

/** Borra un objeto del bucket. Idempotente. */
export async function deleteObject(env: Env, key: string) {
  const s3 = getS3(env);
  await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

/**
 * Devuelve metadata del objeto si existe en R2, o `null` si no.
 * Usado por /media/:id/confirm para verificar que el browser realmente
 * subió el archivo antes de marcarlo como listo en BD.
 */
export async function headObject(env: Env, key: string): Promise<{ sizeBytes: number; contentType?: string } | null> {
  const s3 = getS3(env);
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
    return {
      sizeBytes: res.ContentLength ?? 0,
      contentType: res.ContentType
    };
  } catch (err: any) {
    // R2/S3 señalan "no existe" con varios shapes posibles — cubrimos todos.
    const status = err?.$metadata?.httpStatusCode ?? err?.$response?.statusCode;
    const name = err?.name ?? err?.Code;
    if (
      status === 404 ||
      name === 'NotFound' ||
      name === 'NoSuchKey'
    ) return null;
    throw err;
  }
}

/**
 * Sanitiza un nombre de archivo para usarlo como slug:
 *   "Foto Comedor 01 .JPG" → "foto-comedor-01.jpg"
 * Devuelve la extensión por separado para inferir contentType.
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
