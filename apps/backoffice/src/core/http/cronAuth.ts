import { createHash, timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/core/shared';

/** Vercel Cron envía `Authorization: Bearer <CRON_SECRET>`. Sin secreto configurado no pasa nadie. */
export function isCronAuthorized(request: Request): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get('authorization') ?? '';
  // Se comparan los hashes para que la comparación en tiempo constante no dependa de la longitud.
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(`Bearer ${secret}`));
}
