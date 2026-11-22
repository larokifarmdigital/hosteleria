import type { User } from '../domain/models/user';
import type { users } from '@/core/shared/infrastructure/drizzle/schema';

export function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    role: row.role,
    avatarColor: row.avatarColor,
    createdAt: row.createdAt,
    lastAccessAt: row.lastAccessAt,
    suspendedAt: row.suspendedAt
  };
}
