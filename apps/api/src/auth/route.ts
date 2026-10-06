import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { sessions } from '../db/schema/auth.js';
import { getLucia } from './lucia.js';
import { requireAuth, type AuthVars } from './middleware.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { noCache } from '../middleware/cache.js';
import { performLogin, extractIp } from './login-service.js';
import { requestPasswordReset, applyPasswordChange } from './password-flow.js';
import { parseDeviceHint } from './device-hint.js';
import type { Env } from '../env.js';

/**
 * Rutas HTTP de autenticación.
 *
 * Los endpoints acá quedan THIN: validan el body, llaman a un service y
 * devuelven la response. Toda la lógica de negocio (hashing, tokens,
 * email) está en `login-service.ts` y `password-flow.ts`.
 *
 * **Endpoints**:
 *  - `POST /auth/login`         — email + password → cookie
 *  - `POST /auth/logout`        — invalida sesión + limpia cookie
 *  - `GET  /auth/session`       — devuelve `{ user }` del request actual
 *  - `GET  /auth/sessions`      — lista sesiones activas del user
 *  - `DELETE /auth/sessions/:id`— cierra 1 sesión del user
 *  - `DELETE /auth/sessions`    — cierra TODAS menos la actual
 *  - `POST /auth/forgot`        — manda email con link de reset
 *  - `POST /auth/reset`         — consume reset token + setea nueva password
 *  - `POST /auth/set-password`  — consume setup token (welcome) + primera password
 */
export function createAuthRoutes() {
  const app = new Hono<{ Bindings: Env; Variables: AuthVars }>();

  // ─── Rate limiters ────────────────────────────────────────────────
  // Key compuesta IP+email para que un atacante no pueda saturar un email
  // ajeno desde una IP ni gastar su propio límite rápido.
  const loginRateLimit = rateLimit({
    bucket: 'auth-login',
    limit: 5,
    windowSeconds: 3600,
    keyFn: async (c: any) => keyByIpAndBodyEmail(c)
  });
  const forgotRateLimit = rateLimit({
    bucket: 'auth-forgot',
    limit: 3,
    windowSeconds: 3600,
    keyFn: async (c: any) => keyByIpAndBodyEmail(c)
  });

  // ─── POST /auth/login ─────────────────────────────────────────────
  app.post('/login',
    loginRateLimit,
    zValidator('json', z.object({ email: z.string().email(), password: z.string().min(1) })),
    async (c) => {
      const result = await performLogin(c.env, c.req.valid('json'), {
        ip: extractIp(c.req.raw.headers),
        userAgent: c.req.header('user-agent') ?? null
      });
      c.header('Set-Cookie', result.sessionCookie, { append: true });
      return c.json({ user: result.user });
    }
  );

  // ─── POST /auth/logout ────────────────────────────────────────────
  app.post('/logout', requireAuth, async (c) => {
    const session = c.get('session');
    const lucia = getLucia(c.env, { production: c.env.SENTRY_ENV === 'production' });
    if (session) await lucia.invalidateSession(session.id);
    c.header('Set-Cookie', lucia.createBlankSessionCookie().serialize(), { append: true });
    return c.json({ ok: true });
  });

  // ─── GET /auth/session ────────────────────────────────────────────
  app.get('/session', noCache, (c) => {
    const user = c.get('user');
    if (!user) return c.json({ user: null });
    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarColor: user.avatarColor }
    });
  });

  // ─── GET /auth/sessions ───────────────────────────────────────────
  // Lista las sesiones activas del user actual con device info.
  app.get('/sessions', requireAuth, noCache, async (c) => {
    const user = c.get('user')!;
    const currentSession = c.get('session')!;
    const db = getDb(c.env.DATABASE_URL);
    const now = new Date();

    const rows = await db.select().from(sessions)
      .where(eq(sessions.userId, user.id))
      .orderBy(desc(sessions.createdAt));

    return c.json({
      sessions: rows
        .filter(s => s.expiresAt > now)
        .map(s => ({
          id: s.id,
          userAgent: s.userAgent,
          deviceHint: parseDeviceHint(s.userAgent),
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          current: s.id === currentSession.id
        }))
    });
  });

  // ─── DELETE /auth/sessions/:id ────────────────────────────────────
  // Cierra UNA sesión del user. Útil para "cerrar en otro dispositivo".
  app.delete('/sessions/:id', requireAuth, async (c) => {
    const user = c.get('user')!;
    const sessionId = c.req.param('id');
    const db = getDb(c.env.DATABASE_URL);

    const target = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
    if (!target || target.userId !== user.id) throw new HTTPException(404, { message: 'not_found' });

    const lucia = getLucia(c.env, { production: c.env.SENTRY_ENV === 'production' });
    await lucia.invalidateSession(sessionId);
    return c.json({ ok: true });
  });

  // ─── DELETE /auth/sessions ────────────────────────────────────────
  // Cierra TODAS las sesiones del user excepto la actual.
  app.delete('/sessions', requireAuth, async (c) => {
    const user = c.get('user')!;
    const current = c.get('session')!;
    const db = getDb(c.env.DATABASE_URL);

    const all = await db.query.sessions.findMany({ where: eq(sessions.userId, user.id) });
    const lucia = getLucia(c.env, { production: c.env.SENTRY_ENV === 'production' });
    await Promise.all(all.filter(s => s.id !== current.id).map(s => lucia.invalidateSession(s.id)));
    return c.json({ ok: true, closed: all.length - 1 });
  });

  // ─── POST /auth/forgot ────────────────────────────────────────────
  // Idempotente — siempre 200. La lógica (si existe, mandar email) está en
  // password-flow.ts; acá solo validamos y llamamos.
  app.post('/forgot',
    forgotRateLimit,
    zValidator('json', z.object({ email: z.string().email() })),
    async (c) => {
      await requestPasswordReset(c.env, c.req.valid('json').email);
      return c.json({ ok: true });
    }
  );

  // ─── POST /auth/reset ─────────────────────────────────────────────
  app.post('/reset',
    zValidator('json', z.object({ token: z.string().min(16), newPassword: z.string().min(8).max(200) })),
    async (c) => {
      const body = c.req.valid('json');
      await applyPasswordChange(c.env, { ...body, kind: 'password_reset' });
      return c.json({ ok: true });
    }
  );

  // ─── POST /auth/set-password ─────────────────────────────────────
  // Mismo que /reset pero valida kind=password_setup (welcome email).
  app.post('/set-password',
    zValidator('json', z.object({ token: z.string().min(16), newPassword: z.string().min(8).max(200) })),
    async (c) => {
      const body = c.req.valid('json');
      await applyPasswordChange(c.env, { ...body, kind: 'password_setup' });
      return c.json({ ok: true });
    }
  );

  return app;
}

/**
 * Helper interno: lee IP + email del body JSON (clonando para no consumir
 * el stream) y los concatena como key del rate limiter.
 */
async function keyByIpAndBodyEmail(c: any): Promise<string> {
  const ip = extractIp(c.req.raw.headers);
  try {
    const body = await c.req.raw.clone().json();
    return `${ip}:${(body.email ?? '').toLowerCase()}`;
  } catch {
    return ip;
  }
}
