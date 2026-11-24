import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';
import { apiReference } from '@scalar/hono-api-reference';
import { getDb, getEnv } from '@/core/shared';
import { validateSession } from './middleware/authMiddleware';
import { withContainer } from './middleware/withContainer';
import { rebuildSiteAfterWrite } from './middleware/rebuildSite';
import { globalErrorHandler } from './httpErrors';
import { createAuthRoutes } from './routes/authRoutes';
import { createRestaurantsRoutes } from './routes/restaurantsRoutes';
import { createSpacesRoutes } from './routes/spacesRoutes';
import { createLegalPagesRoutes } from './routes/legalPagesRoutes';
import { createDishesRoutes } from './routes/dishesRoutes';
import { createWinesRoutes } from './routes/winesRoutes';
import { createLanguagesRoutes } from './routes/languagesRoutes';
import { createUsersRoutes } from './routes/usersRoutes';
import { createMediaRoutes } from './routes/mediaRoutes';
import { createPublicRoutes } from './routes/publicRoutes';
import { openApiSpec } from './openapi';
import { getClientIp, rateLimit } from './middleware/rate-limit';
import { requireSameOrigin } from './middleware/sameOrigin';
import type { AppBindings, Defer } from './types';

export interface AppOptions {
  /** Aplaza trabajo hasta después de responder (`after()` en Next). Sin él, se espera. */
  defer?: Defer;
  /** Prefijo público bajo el que se sirve la app; solo lo usa la página de documentación. */
  publicBasePath?: string;
}

// Las rutas se declaran sin prefijo (`/restaurants`): quien monta la app decide
// dónde cuelga. Sin CORS: el backoffice la sirve en su mismo origen y las
// landings leen `/public` en el build, sin navegador.
export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppBindings>();

  app.use('*', logger());

  app.use('*', async (c, next) => {
    c.set('defer', options.defer);
    await next();
  });

  app.use('*', requireSameOrigin);
  app.use('*', withContainer);
  app.use('*', rebuildSiteAfterWrite);
  // `/public` no mira la sesión: su respuesta es la misma para todo el mundo
  // y no debe llevar cookies.
  app.use('*', async (c, next) => {
    if (!c.req.path.startsWith('/public/')) return validateSession(c, next);
    c.set('user', null);
    c.set('session', null);
    return next();
  });

  // `auth/*` tiene limiters propios más estrictos; health/docs son públicos.
  // Con sesión se cuenta por usuario y no por IP: las peticiones del backoffice
  // llegan todas desde la IP de su servidor, y contarlas juntas haría que unos
  // usuarios agotaran el límite de otros.
  const globalLimiter = rateLimit({
    bucket: 'global',
    limit: 100,
    windowSeconds: 60,
    keyFn: (c) => {
      const user = c.get('user');
      return user ? `user:${user.id}` : getClientIp(c);
    }
  });
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

  app.get('/', (c) => c.json({
    name: 'hosteleria-backoffice-api',
    version: '0.0.1'
  }));

  app.get('/health', async (c) => {
    const start = Date.now();
    let dbOk = false;
    try {
      const db = getDb(getEnv().DATABASE_URL);
      await db.execute(sql`select 1`);
      dbOk = true;
    } catch (err) {
      // El mensaje del driver puede llevar el host de la base de datos: va al log, no a la respuesta.
      console.error('[health] db error:', err instanceof Error ? err.message : err);
    }
    return c.json({
      ok: dbOk,
      db: dbOk ? 'connected' : 'error',
      latencyMs: Date.now() - start,
      version: '0.0.1'
    }, dbOk ? 200 : 503);
  });

  // La página de documentación carga un script de terceros: en producción correría en
  // el mismo origen que la sesión. Solo existe en local.
  if (getEnv().APP_ENV === 'development') {
    app.get('/openapi.json', (c) => c.json(openApiSpec));
    app.get('/docs', apiReference({
      theme: 'default',
      layout: 'modern',
      spec: { url: `${options.publicBasePath ?? ''}/openapi.json` },
      metaData: { title: '@hosteleria/api — Reference' }
    }));
  }

  app.route('/public', createPublicRoutes());
  app.route('/auth', createAuthRoutes());
  app.route('/restaurants', createRestaurantsRoutes());
  app.route('/restaurants/:slug/spaces', createSpacesRoutes());
  app.route('/restaurants/:slug/legal-pages', createLegalPagesRoutes());
  app.route('/dishes', createDishesRoutes());
  app.route('/wines', createWinesRoutes());
  app.route('/languages', createLanguagesRoutes());
  app.route('/users', createUsersRoutes());
  app.route('/media', createMediaRoutes());

  app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

  app.onError(globalErrorHandler);

  return app;
}
