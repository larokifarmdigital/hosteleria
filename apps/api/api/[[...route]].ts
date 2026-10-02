import { handle } from '@hono/vercel';
import { createApp } from '../src/app';

// Vercel Function catch-all. `vercel.json` reescribe todo el tráfico a /api/*,
// y esta función lo delega a la app Hono. En prod las env vars vienen del
// dashboard Vercel (Settings → Environment Variables).
export const config = { runtime: 'nodejs' };

const app = createApp();
const inner = handle(app);

/** La rewrite de vercel.json manda '/health' → '/api/health'. Pero Hono tiene
 *  las rutas montadas en root ('/health', '/auth/login', ...). Hay que quitar
 *  el prefijo '/api' antes de que Hono vea la request, si no responde 404. */
export default async function handler(req: Request): Promise<Response> {
  const u = new URL(req.url);
  if (u.pathname === '/api' || u.pathname.startsWith('/api/')) {
    u.pathname = u.pathname === '/api' ? '/' : u.pathname.slice(4);
    return inner(new Request(u.toString(), req));
  }
  return inner(req);
}
