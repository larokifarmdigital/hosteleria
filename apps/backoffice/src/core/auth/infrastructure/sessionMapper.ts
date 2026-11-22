import type { Session } from '../domain/models/session';
import type { sessions } from '@/core/shared/infrastructure/drizzle/schema';

export function rowToSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    userAgent: row.userAgent,
    ipHash: row.ipHash
  };
}
