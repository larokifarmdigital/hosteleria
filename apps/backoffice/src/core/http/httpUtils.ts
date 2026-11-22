/**
 * `x-forwarded-for[0]` > `x-real-ip` > `'unknown'`. Las dos las fija la plataforma
 * (Vercel pisa lo que mande el cliente). `cf-connecting-ip` ya no se mira: sin
 * Cloudflare delante la escribe quien quiera, y con ella se saltaría el límite de peticiones.
 */
export function extractIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || 'unknown'
  );
}
