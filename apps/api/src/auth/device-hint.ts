/**
 * Heurística simple para mostrar al usuario qué dispositivo usó una sesión.
 *
 * No pretende ser preciso — parsea el `User-Agent` y devuelve un texto tipo
 * "macOS · Chrome" o "iPhone · Safari". Para "cerrar sesión en otro dispositivo"
 * en la UI alcanza.
 *
 * Dónde se usa: `src/auth/route.ts` → GET /auth/sessions.
 */
export function parseDeviceHint(ua: string | null): string {
  if (!ua) return 'Desconocido';

  const lower = ua.toLowerCase();

  const browser = lower.includes('firefox')
    ? 'Firefox'
    : lower.includes('edg/')
      ? 'Edge'
      : lower.includes('chrome') && !lower.includes('chromium')
        ? 'Chrome'
        : lower.includes('safari')
          ? 'Safari'
          : 'Browser';

  const os = lower.includes('iphone')
    ? 'iPhone'
    : lower.includes('ipad')
      ? 'iPad'
      : lower.includes('android')
        ? 'Android'
        : lower.includes('mac os') || lower.includes('macintosh')
          ? 'macOS'
          : lower.includes('windows')
            ? 'Windows'
            : lower.includes('linux')
              ? 'Linux'
              : 'Desconocido';

  return `${os} · ${browser}`;
}
