import { handle } from '@hono/vercel';
import { createApp } from '../src/app.js';

// Vercel Function catch-all. `vercel.json` reescribe todo el tráfico a /api/*,
// y esta función lo delega a la app Hono. En prod las env vars vienen del
// dashboard Vercel (Settings → Environment Variables).
export const config = { runtime: 'nodejs' };

const app = createApp();
const h = handle(app);

// @vercel/node espera named HTTP methods o signature (req, res) => void.
// Un `export default (req) => Response` lo trata como legacy y descarta
// la Response devuelta → timeout. Exportando por método, usa fetch-style.
export const GET = h;
export const POST = h;
export const PATCH = h;
export const PUT = h;
export const DELETE = h;
export const OPTIONS = h;
export const HEAD = h;
