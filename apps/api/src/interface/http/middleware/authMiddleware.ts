import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getCookie } from 'hono/cookie';
import type { AppBindings } from '../types.js';

const COOKIE_NAME = 'hs_session';

export const validateSession = createMiddleware<AppBindings>(async (c, next) => {
  const container = c.get('container');
  const sessionId = getCookie(c, COOKIE_NAME) ?? null;

  const result = await container.repos.sessionsRepo.validate(sessionId);
  if (!result) {
    // Si venía cookie pero la sesión caducó, limpiamos el browser.
    if (sessionId) {
      c.header('Set-Cookie', container.repos.sessionsRepo.blankCookieHeader(), { append: true });
    }
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  // `cookieHeader` solo viene cuando Lucia refrescó la sesión (fresh=true).
  if (result.cookieHeader) {
    c.header('Set-Cookie', result.cookieHeader, { append: true });
  }
  c.set('user', result.user as any);
  c.set('session', result.session as any);
  await next();
});

export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  if (!c.get('user')) throw new HTTPException(401, { message: 'unauthorized' });
  await next();
});

export const requireAdmin = createMiddleware<AppBindings>(async (c, next) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'unauthorized' });
  if (user.role !== 'admin') throw new HTTPException(403, { message: 'admin_required' });
  await next();
});

/** Admin pasa libre; editor solo si tiene el restaurant en `user_restaurants`. */
export function requireRestaurant(paramName = 'slug') {
  return createMiddleware<AppBindings>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw new HTTPException(401, { message: 'unauthorized' });
    if (user.role === 'admin') return next();

    const slug = c.req.param(paramName);
    if (!slug) throw new HTTPException(400, { message: 'missing_slug' });

    const { restaurantsRepo, usersRepo } = c.get('container').repos;
    const [r, allowedIds] = await Promise.all([
      restaurantsRepo.findBySlug(slug),
      usersRepo.listRestaurantIds(user.id)
    ]);
    if (!r || !allowedIds.includes(r.id)) {
      throw new HTTPException(403, { message: 'restaurant_forbidden' });
    }
    await next();
  });
}
