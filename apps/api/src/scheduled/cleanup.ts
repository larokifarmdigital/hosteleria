import { lt } from 'drizzle-orm';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import { sessions } from '../infrastructure/persistence/drizzle/schema/auth.js';
import { cleanupStaleRateLimits } from '../middleware/rate-limit.js';
import type { Env } from '../env.js';

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
