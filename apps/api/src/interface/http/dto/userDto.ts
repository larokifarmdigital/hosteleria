import type { User } from '../../../domain/models/user.js';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}

/**
 * Serializa `User` + sus restaurantSlugs al shape público. Nunca expone
 * `passwordHash`. Para admins el campo `restaurants` es `['*']` (todos).
 */
export function userToDto(user: User, restaurantSlugs: string[]) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    initials: initialsOf(user.name),
    avatarColor: user.avatarColor,
    role: user.role,
    restaurants: user.role === 'admin' ? ['*'] : restaurantSlugs,
    lastAccessAt: user.lastAccessAt?.toISOString() ?? null
  };
}
