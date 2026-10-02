import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { lt } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { sessions } from '../db/schema/auth.js';
import { cleanupStaleRateLimits } from '../lib/rate-limit.js';
import { runBackup } from '../lib/backup.js';
import type { AuthVars } from '../auth/middleware.js';

/**
 * Endpoints internos ejecutados por Vercel Cron.
 *
 * Protegidos con header `Authorization: Bearer <CRON_SECRET>`.
 * Vercel añade este header automáticamente a las requests programadas.
 * Ver `apps/api/vercel.json` para el schedule.
 */
export function createCronRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();

  // Guard: todas las rutas de /cron requieren el bearer.
  app.use('*', async (c, next) => {
    const env = c.get('env');
    if (!env.CRON_SECRET) throw new HTTPException(503, { message: 'cron_not_configured' });
    const auth = c.req.header('authorization') ?? '';
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      throw new HTTPException(401, { message: 'unauthorized_cron' });
    }
    await next();
  });

  /**
   * Borra sesiones Lucia caducadas + filas de rate_limits viejas (>7d).
   * Programado diariamente.
   */
  app.post('/cleanup', async (c) => {
    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);
    const now = new Date();

    const deletedSessions = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now))
      .returning({ id: sessions.id });

    await cleanupStaleRateLimits(env);

    return c.json({
      ok: true,
      deletedSessions: deletedSessions.length,
      ranAt: now.toISOString()
    });
  });

  /**
   * Backup JSON de toda la BD a R2. Programado diariamente a las 03:00 UTC.
   * Se mantienen 30 días (más viejos se purgan automáticamente).
   */
  app.post('/backup', async (c) => {
    const env = c.get('env');
    const result = await runBackup(env);
    return c.json({ ok: true, ...result });
  });

  return app;
}
