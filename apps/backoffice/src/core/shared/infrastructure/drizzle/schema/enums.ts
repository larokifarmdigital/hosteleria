import { pgEnum } from 'drizzle-orm/pg-core';

export const publishStateEnum = pgEnum('publish_state', [
  'published',
  'draft',
  'warnings',
  'new'
]);

export const spaceTypeEnum = pgEnum('space_type', [
  'restaurant',
  'cafe',
  'coctel',
  'club',
  'terraza',
  'live_music',
  'otro'
]);

export const mediaUsageEnum = pgEnum('media_usage', [
  'hero',
  'gallery',
  'dish',
  'unused'
]);

export const userRoleEnum = pgEnum('user_role', ['admin', 'editor']);

// Mismo alfabeto que schema.org.
export const weekDayEnum = pgEnum('week_day', ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
