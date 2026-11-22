/** `cf-connecting-ip` > `x-forwarded-for[0]` > `x-real-ip` > `'unknown'`. */
export function extractIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip')
    ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers.get('x-real-ip')
    ?? 'unknown'
  );
}
