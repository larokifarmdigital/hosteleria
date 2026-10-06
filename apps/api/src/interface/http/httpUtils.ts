/**
 * Extrae la IP real del cliente leyendo headers de Cloudflare y proxies.
 * Devuelve 'unknown' si no detecta nada. Se usa como entrada al hash GDPR
 * en el login y al rate limiter.
 */
export function extractIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip')
    ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers.get('x-real-ip')
    ?? 'unknown'
  );
}
