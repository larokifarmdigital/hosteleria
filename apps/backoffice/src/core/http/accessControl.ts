import { HTTPException } from 'hono/http-exception';
import { MediaNotFoundError, MediaNotInRestaurantError } from '@/core/media';
import type { Context } from 'hono';
import type { AppBindings } from './types';

/** Para rutas sin `:slug` en la URL (dishes/wines/media). `null` = admin. */
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
  if (!allowed.has(spaceId)) throw new HTTPException(403, { message: 'SPACE_FORBIDDEN' });
}

/** Una imagen solo se puede asignar a contenido de su mismo restaurante. */
export async function assertMediaInRestaurant(c: Context<AppBindings>, mediaId: string, restaurantId: string): Promise<void> {
  const media = await c.get('container').repos.mediaRepo.findById(mediaId);
  if (!media || !media.confirmedAt) throw new MediaNotFoundError(mediaId);
  if (media.restaurantId !== restaurantId) throw new MediaNotInRestaurantError();
}
