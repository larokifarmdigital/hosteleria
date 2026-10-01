import { handle } from '@hono/vercel';
import { createApp } from '../src/app';

// Vercel Function catch-all. `vercel.json` reescribe todo el tráfico a /api,
// y esta función lo delega a la app Hono. En prod las env vars vienen del
// dashboard Vercel (Settings → Environment Variables).
export const config = { runtime: 'nodejs' };

const app = createApp();
export default handle(app);
