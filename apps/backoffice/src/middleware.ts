import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, loginPath } from '@/lib/auth/paths';

// Solo comprueba que haya cookie; que la sesión siga viva lo valida el layout
// de (app) contra el api. Deja el pathname en un header porque los layouts de
// Next no reciben la URL y la necesitan para volver tras el login.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const current = pathname + search;

  if (!req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL(loginPath(current), req.url));
  }

  const headers = new Headers(req.headers);
  headers.set('x-pathname', current);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Fuera: login, las páginas de elegir contraseña (se llega sin sesión, desde una invitación o «Olvidé mi contraseña»),
  // el api (responde 401 él mismo, y `/api/public/*` y `/api/cron/*` no llevan sesión), internos de Next y ficheros estáticos.
  matcher: ['/((?!login|set-password|reset-password|api/|api$|_next/|.*\\..*).*)']
};
