import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';
import type { AppBindings } from './types.js';

/**
 * Resuelve qué space ids puede tocar el user actual.
 *
 * - admin → `null` (sin restricción).
 * - editor → `Set<string>` con los space ids de los restaurantes que tiene
 *   asignados en `user_restaurants`.
 *
 * Útil en las rutas de dishes/wines/media que son "flat" (sin :slug en la
 * URL) y necesitan filtrar por scope del user.
 */
export async function allowedSpaceIds(c: Context<AppBindings>): Promise<Set<string> | null> {
  const user = c.get('user')!;
  if (user.role === 'admin') return null;

  const container = c.get('container');
  const restaurantIds = await container.repos.usersRepo.listRestaurantIds(user.id);
  if (restaurantIds.length === 0) return new Set();

  const restaurants = await container.repos.restaurantsRepo.listAccessibleBy(restaurantIds);
  const spaceLists = await Promise.all(
    restaurants.map(r => container.spaces.list.execute(r.slug))
  );
  const ids = new Set<string>();
  for (const batch of spaceLists) for (const s of batch) ids.add(s.id);
  return ids;
}

/** Lanza 403 si el user no puede tocar `spaceId`. */
export async function assertSpaceAccess(c: Context<AppBindings>, spaceId: string): Promise<void> {
  const allowed = await allowedSpaceIds(c);
  if (allowed === null) return;
  if (!allowed.has(spaceId)) throw new HTTPException(403, { message: 'space_forbidden' });
}
