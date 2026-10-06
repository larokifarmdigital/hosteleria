import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';
import type { AppBindings } from './types.js';

/**
 * Para rutas "flat" (dishes/wines/media sin `:slug` en la URL): devuelve
 * el set de space ids que el user puede tocar, o `null` si es admin.
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

export async function assertSpaceAccess(c: Context<AppBindings>, spaceId: string): Promise<void> {
  const allowed = await allowedSpaceIds(c);
  if (allowed === null) return;
  if (!allowed.has(spaceId)) throw new HTTPException(403, { message: 'space_forbidden' });
}
