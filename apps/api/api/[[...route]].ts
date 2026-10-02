import { getRequestListener } from '@hono/node-server';
import { createApp } from '../src/app.js';

// Vercel Function catch-all. `vercel.json` reescribe todo el tráfico a /api/*,
// y esta función lo delega a la app Hono. En prod las env vars vienen del
// dashboard Vercel (Settings → Environment Variables).
export const config = { runtime: 'nodejs' };

const app = createApp();

// `@hono/vercel` solo funciona en Edge Runtime (export default fetch-style).
// En Node Runtime (/api/*.ts es Pages Router convention), Vercel espera un
// handler `(req, res) => void`. `getRequestListener` de @hono/node-server
// produce exactamente eso adaptando Hono a Node http. Con esto, TODOS los
// métodos (GET, POST, PATCH, DELETE, OPTIONS...) funcionan — antes solo GET.
export default getRequestListener(app.fetch);
