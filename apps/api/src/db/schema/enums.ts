import { pgEnum } from 'drizzle-orm/pg-core';

// Estado de publicación (comparten restaurantes y espacios).
export const publishStateEnum = pgEnum('publish_state', [
  'published',
  'draft',
  'warnings',
  'new'
]);

// Tipo de espacio (para diferenciar bar/restaurante/terraza/etc.).
export const spaceTypeEnum = pgEnum('space_type', [
  'restaurant',
  'cafe',
  'coctel',
  'club',
  'terraza',
  'live_music',
  'otro'
]);

// Uso del asset de media (dónde está referenciado).
export const mediaUsageEnum = pgEnum('media_usage', [
  'hero',
  'gallery',
  'dish',
  'unused'
]);

// Rol del usuario en el backoffice.
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor']);

// Día de la semana (ISO abreviado, mismo alfabeto que schema.org).
export const weekDayEnum = pgEnum('week_day', ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
