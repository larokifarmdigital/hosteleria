import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { loadEnv } from './env.js';
import { getDb } from './db/client.js';
import { sql } from 'drizzle-orm';
import { validateSession, type AuthVars } from './auth/middleware.js';
import { createAuthRoutes } from './routes/auth.js';
import { createRestaurantsRoutes } from './routes/restaurants.js';
import { createSpacesRoutes } from './routes/spaces.js';
import { createDishesRoutes } from './routes/dishes.js';
import { createWinesRoutes } from './routes/wines.js';
import { createLanguagesRoutes } from './routes/languages.js';
import { createUsersRoutes } from './routes/users.js';
import { createMediaRoutes } from './routes/media.js';
import { createCronRoutes } from './routes/cron.js';
import { apiReference } from '@scalar/hono-api-reference';
import { openApiSpec } from './openapi.js';
import { initSentry, sentryMiddleware } from './lib/sentry.js';
import { rateLimit } from './lib/rate-limit.js';

/**
 * App Hono principal. Se monta como Vercel Function catch-all
 * (api/[[...route]].ts) en prod y como server Node (@hono/node-server)
 * en dev via src/dev.ts.
 *
 * Rutas de negocio (restaurants/spaces/…) se añaden en tasks 5+.
 */
export function createApp() {
  const env = loadEnv();
  initSentry(env);
  // basePath '/api' — todas las rutas quedan bajo /api/* (ej. /api/health,
  // /api/auth/login). Vercel con api/[[...route]].ts entrega las requests con
  // /api incluido en el path, así que Hono matchea nativamente. En dev
  // (@hono/node-server) el user también hits /api/* para mantener consistencia.
  const app = new Hono<{ Variables: AuthVars }>().basePath('/api');

  app.use('*', logger());
  // Sentry debe ir temprano para capturar errores de rutas posteriores,
  // pero DESPUÉS de que c.get('env') / c.get('user') estén disponibles.
  // Como auth lee user, lo ponemos después del middleware de user — ver abajo.

  app.use('*', cors({
    origin: env.ALLOWED_ORIGIN.split(',').map(s => s.trim()),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  }));

  // Inyecta env en context para que los handlers no lo relean.
  app.use('*', async (c, next) => {
    c.set('env', env);
    await next();
  });

  // Lee cookie de sesión Lucia y setea user/session en context.
  app.use('*', validateSession);
  // Captura excepciones a Sentry con context (user, path, method).
  app.use('*', sentryMiddleware());

  // Rate limit global suave — protege contra scraping/abuso en todos los
  // endpoints de negocio. Login tiene su propio límite más estricto además
  // de este. Se saltan /health, /docs, /openapi.json, /cron y /auth/* que
  // tienen sus propios límites.
  const globalLimiter = rateLimit({ bucket: 'global', limit: 100, windowSeconds: 60 });
  app.use('*', async (c, next) => {
    const path = c.req.path;
    if (
      path === '/health' ||
      path === '/' ||
      path === '/docs' ||
      path === '/openapi.json' ||
      path.startsWith('/cron/') ||
      path.startsWith('/auth/')
    ) {
      return next();
    }
    return globalLimiter(c, next);
  });

  // ─── Health ────────────────────────────────────────────────────
  app.get('/health', async (c) => {
    const start = Date.now();
    let dbOk = false;
    let dbError: string | null = null;
    try {
      const db = getDb(env.DATABASE_URL);
      await db.execute(sql`select 1`);
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : 'unknown';
    }
    return c.json({
      ok: dbOk,
      db: dbOk ? 'connected' : 'error',
      dbError,
      latencyMs: Date.now() - start,
      version: '0.0.1'
    }, dbOk ? 200 : 503);
  });

  app.get('/', (c) => c.json({
    name: '@hosteleria/api',
    version: '0.0.1',
    docs: '/docs',
    openapi: '/openapi.json'
  }));

  // ─── Documentación ─────────────────────────────────────────────
  app.get('/openapi.json', (c) => c.json(openApiSpec));
  app.get('/docs', apiReference({
    theme: 'default',
    layout: 'modern',
    spec: { url: '/openapi.json' },
    metaData: { title: '@hosteleria/api — Reference' }
  }));

  // ─── Rutas ─────────────────────────────────────────────────────
  app.route('/auth', createAuthRoutes());
  app.route('/restaurants', createRestaurantsRoutes());
  app.route('/restaurants/:slug/spaces', createSpacesRoutes());
  app.route('/dishes', createDishesRoutes());
  app.route('/wines', createWinesRoutes());
  app.route('/languages', createLanguagesRoutes());
  app.route('/users', createUsersRoutes());
  app.route('/media', createMediaRoutes());
  app.route('/cron', createCronRoutes());

  app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error('[api] unhandled:', err);
    return c.json({ error: 'internal_error' }, 500);
  });

  return app;
}
