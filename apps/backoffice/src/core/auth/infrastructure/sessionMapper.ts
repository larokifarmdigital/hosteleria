import type { Session } from '../../../../domain/models/session.js';
import type { sessions } from '../schema/auth.js';

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
