// Carga .env.local primero (dev), luego .env como fallback.
// dotenv por defecto solo lee `.env` — necesita el path explícito.
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env', override: false });

import { serve } from '@hono/node-server';
import { createApp } from './app';

const app = createApp();
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n▲ @hosteleria/api dev\n  http://localhost:${info.port}\n  health: http://localhost:${info.port}/health\n`);
});
