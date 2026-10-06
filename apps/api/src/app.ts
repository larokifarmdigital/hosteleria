import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';
import { apiReference } from '@scalar/hono-api-reference';
import { getDb } from './infrastructure/persistence/drizzle/client.js';
import { validateSession } from './interface/http/middleware/authMiddleware.js';
import { withContainer } from './interface/http/middleware/withContainer.js';
import { globalErrorHandler } from './interface/http/httpErrors.js';
import { createAuthRoutes } from './interface/http/routes/authRoutes.js';
import { createRestaurantsRoutes } from './interface/http/routes/restaurantsRoutes.js';
import { createSpacesRoutes } from './interface/http/routes/spacesRoutes.js';
import { createDishesRoutes } from './interface/http/routes/dishesRoutes.js';
import { createWinesRoutes } from './interface/http/routes/winesRoutes.js';
import { createLanguagesRoutes } from './interface/http/routes/languagesRoutes.js';
import { createUsersRoutes } from './interface/http/routes/usersRoutes.js';
import { createMediaRoutes } from './interface/http/routes/mediaRoutes.js';
import { openApiSpec } from './openapi.js';
import { sentryMiddleware } from './middleware/sentry.js';
import { rateLimit } from './middleware/rate-limit.js';
import type { AppBindings } from './interface/http/types.js';

/**
 * Hono app principal — se monta como fetch handler del Worker.
 *
 * Para añadir un endpoint: crear `src/interface/http/routes/<recurso>Routes.ts`
 * con un `createXxxRoutes()` que devuelva una sub-app Hono, y añadir una
 * línea `app.route('/xxx', createXxxRoutes())` más abajo.
 */
export function createApp() {
  const app = new Hono<AppBindings>();

  // ─── Middlewares globales ──────────────────────────────────────────
  app.use('*', logger());

  // Compat con helpers que leen `c.get('env')` en vez de `c.env`.
  app.use('*', async (c, next) => {
    c.set('env', c.env);
    await next();
  });

  // ALLOWED_ORIGIN vive en `c.env`, por eso la función `origin` dinámica.
  app.use('*', cors({
    origin: (origin, c) => {
      const allowed = (c.env.ALLOWED_ORIGIN ?? '').split(',').map((s: string) => s.trim());
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  }));

  app.use('*', withContainer);
  app.use('*', validateSession);
  app.use('*', sentryMiddleware());

  // `auth/*` tiene limiters propios más estrictos; health/docs son públicos.
  const globalLimiter = rateLimit({ bucket: 'global', limit: 100, windowSeconds: 60 });
  app.use('*', async (c, next) => {
    const path = c.req.path;
    const skip =
      path === '/health' ||
      path === '/' ||
      path === '/docs' ||
      path === '/openapi.json' ||
      path.startsWith('/auth/');
    return skip ? next() : globalLimiter(c as any, next);
  });

  // ─── Rutas públicas ────────────────────────────────────────────────
  app.get('/', (c) => c.json({
    name: '@hosteleria/api',
    version: '0.0.1',
    docs: '/docs',
    openapi: '/openapi.json'
  }));

  app.get('/health', async (c) => {
    const start = Date.now();
    let dbOk = false;
    let dbError: string | null = null;
    try {
      const db = getDb(c.env.DATABASE_URL);
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

  // ─── Documentación ─────────────────────────────────────────────────
  app.get('/openapi.json', (c) => c.json(openApiSpec));
  app.get('/docs', apiReference({
    theme: 'default',
    layout: 'modern',
    spec: { url: '/openapi.json' },
    metaData: { title: '@hosteleria/api — Reference' }
  }));

  // ─── Rutas de negocio ──────────────────────────────────────────────
  app.route('/auth', createAuthRoutes());
  app.route('/restaurants', createRestaurantsRoutes());
  app.route('/restaurants/:slug/spaces', createSpacesRoutes());
  app.route('/dishes', createDishesRoutes());
  app.route('/wines', createWinesRoutes());
  app.route('/languages', createLanguagesRoutes());
  app.route('/users', createUsersRoutes());
  app.route('/media', createMediaRoutes());

  // ─── Error handling ────────────────────────────────────────────────
  app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

  app.onError(globalErrorHandler);

  return app;
}
