/**
 * IP del cliente, de la cabecera más fiable a la menos: `x-vercel-forwarded-for`
 * y `x-real-ip` las fija Vercel; `x-forwarded-for` puede traer delante lo que
 * mande el cliente si hay otro proxy. `cf-connecting-ip` no se mira: sin
 * Cloudflare delante la escribe quien quiera.
 */
export function extractIp(headers: Headers): string {
  return (
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')?.trim()
    || headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
  );
}
