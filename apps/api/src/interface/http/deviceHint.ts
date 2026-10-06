/**
 * Heurística simple para mostrar al usuario qué dispositivo usó una sesión.
 * Parsea el `User-Agent` y devuelve un texto tipo "macOS · Chrome".
 * No pretende ser preciso — alcanza para la UI de "cerrar sesión en otro
 * dispositivo".
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
