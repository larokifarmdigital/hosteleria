export const SESSION_COOKIE = 'hs_session';

/** Solo rutas internas: evita que `?next=` sirva para redirigir a otro sitio. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) return '/';
  return next;
}

export function loginPath(next?: string | null): string {
  const target = safeNext(next);
  return target === '/' ? '/login' : `/login?next=${encodeURIComponent(target)}`;
}
