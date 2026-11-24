import { lt } from 'drizzle-orm';
import { getDb, getEnv } from '@/core/shared';
import { sessions } from '@/core/shared/infrastructure/drizzle/schema';
import { cleanupStaleRateLimits } from '../middleware/rate-limit';
import { DrizzleMediaRepository, R2MediaStorage, CleanupUnconfirmedMediaUseCase } from '@/core/media';

export async function runCleanup() {
  const env = getEnv();
  const db = getDb(env.DATABASE_URL);
  const now = new Date();

  const deletedSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  const deletedRateLimits = await cleanupStaleRateLimits();

  const deletedUploads = await new CleanupUnconfirmedMediaUseCase(
    new DrizzleMediaRepository(env),
    new R2MediaStorage(env)
  ).execute(now);

  const result = {
    deletedSessions: deletedSessions.length,
    deletedRateLimits,
    deletedUploads,
    ranAt: now.toISOString()
  };
  console.log('[cron:cleanup]', result);
  return result;
}
