import { lt } from 'drizzle-orm';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import { sessions } from '../infrastructure/persistence/drizzle/schema/auth.js';
import { cleanupStaleRateLimits } from '../middleware/rate-limit.js';
import type { Env } from '../env.js';

/**
 * Housekeeping diario — ejecuta mantenimiento sobre la BD.
 *
 * Lo invoca el `scheduled` handler del Worker (ver `src/index.ts`) una vez
 * al día (04:00 UTC, configurado en `wrangler.toml#triggers.crons`).
 *
 * Borra:
 *  - Sesiones Lucia con `expiresAt < now` → cookies caducadas ya inválidas.
 *  - Filas de `rate_limits` cuya ventana cerró hace >7 días → ya no sirven
 *    para rate-limiting actual.
 *
 * Es idempotente y seguro re-correr. El resultado se loguea para que lo
 * veas en el dashboard de Cloudflare → Workers → Logs.
 */
export async function runCleanup(env: Env) {
  const db = getDb(env.DATABASE_URL);
  const now = new Date();

  const deletedSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  const deletedRateLimits = await cleanupStaleRateLimits(env);

  const result = {
    deletedSessions: deletedSessions.length,
    deletedRateLimits,
    ranAt: now.toISOString()
  };
  console.log('[cron:cleanup]', result);
  return result;
}
