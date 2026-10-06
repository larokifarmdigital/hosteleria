import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import type { User, Session } from 'lucia';
import { getLucia } from './lucia.js';
import { getDb } from '../infrastructure/persistence/drizzle/client.js';
import { userRestaurants, users as usersTable } from '../infrastructure/persistence/drizzle/schema/auth.js';
import { restaurants } from '../infrastructure/persistence/drizzle/schema/content.js';
import type { Env } from '../env.js';

export type AuthVars = {
  env: Env;
  user: User | null;
  session: Session | null;
};

/**
 * validateSession — Middleware base. Lee la cookie `hs_session`, valida con
 * Lucia y setea `c.set('user')` + `c.set('session')`. No bloquea si no hay
 * sesión — solo requireAuth / requireAdmin lo hacen.
 *
 * Además rota la cookie si Lucia decidió refrescarla (fresh session),
 * y borra la cookie si la sesión ya no es válida.
 */
export const validateSession = createMiddleware<{ Bindings: Env; Variables: AuthVars }>(async (c, next) => {
  const env = c.get('env');
  const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });

  const sessionId = getCookie(c, lucia.sessionCookieName) ?? null;
  if (!sessionId) {
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    const cookie = lucia.createSessionCookie(session.id);
    c.header('Set-Cookie', cookie.serialize(), { append: true });
  }
  if (!session) {
    const cookie = lucia.createBlankSessionCookie();
    c.header('Set-Cookie', cookie.serialize(), { append: true });
  }

  c.set('user', user);
  c.set('session', session);
  await next();
});

/** Bloquea si no hay sesión válida. */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthVars }>(async (c, next) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'unauthorized' });
  await next();
});

/** Bloquea si el usuario no es admin. */
export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: AuthVars }>(async (c, next) => {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'unauthorized' });
  if (user.role !== 'admin') throw new HTTPException(403, { message: 'admin_required' });
  await next();
});

/**
 * Bloquea si el editor no tiene acceso al restaurante :slug.
 * Admins pasan siempre.
 */
export function requireRestaurant(paramName = 'slug') {
  return createMiddleware<{ Bindings: Env; Variables: AuthVars }>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw new HTTPException(401, { message: 'unauthorized' });
    if (user.role === 'admin') return next();

    const slug = c.req.param(paramName);
    if (!slug) throw new HTTPException(400, { message: 'missing_slug' });

    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);
    const row = await db
      .select({ id: restaurants.id })
      .from(userRestaurants)
      .innerJoin(restaurants, eq(restaurants.id, userRestaurants.restaurantId))
      .where(and(eq(userRestaurants.userId, user.id), eq(restaurants.slug, slug)))
      .limit(1);
    if (row.length === 0) throw new HTTPException(403, { message: 'restaurant_forbidden' });
    await next();
  });
}

/** Utilidad: actualiza `users.lastAccessAt` sin bloquear la respuesta. */
export async function touchLastAccess(env: Env, userId: string) {
  try {
    const db = getDb(env.DATABASE_URL);
    await db.update(usersTable).set({ lastAccessAt: new Date() }).where(eq(usersTable.id, userId));
  } catch {
    // No hacemos nada — es best-effort.
  }
}
