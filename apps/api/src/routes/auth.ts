import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { verifyPassword, hashPassword, DUMMY_HASH } from '../auth/password.js';
import { createHash } from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { users, sessions } from '../db/schema/auth.js';
import { getLucia } from '../auth/lucia.js';
import { requireAuth, touchLastAccess, type AuthVars } from '../auth/middleware.js';
import { rateLimit } from '../lib/rate-limit.js';
import { createToken, consumeToken, invalidateUserTokens } from '../lib/tokens.js';
import { getEmailProvider, passwordResetTemplate } from '../lib/email.js';
import { checkPasswordStrength } from '../lib/password.js';
import { noCache } from '../lib/cache.js';

/**
 * Rutas de autenticación.
 *
 *  POST /auth/login   — email + password → cookie de sesión
 *  POST /auth/logout  — invalida sesión y limpia cookie
 *  GET  /auth/session — devuelve { user, session } o { user: null }
 */
export function createAuthRoutes() {
  const app = new Hono<{ Variables: AuthVars }>();

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  // Rate limit agresivo: 5 intentos/hora por IP+email. Doble key para que
  // el atacante no pueda saturar un email ajeno desde una sola IP sin ser
  // bloqueado por su propia IP.
  const loginRateLimit = rateLimit({
    bucket: 'auth-login',
    limit: 5,
    windowSeconds: 3600,
    keyFn: async (c: any) => {
      const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      // Intento leer email del body para la key compuesta
      try {
        const clone = c.req.raw.clone();
        const body = await clone.json();
        return `${ip}:${(body.email ?? '').toLowerCase()}`;
      } catch {
        return ip;
      }
    }
  });

  app.post('/login', loginRateLimit, zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const env = c.get('env');
    const db = getDb(env.DATABASE_URL);

    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });

    // Verificación en tiempo constante — no filtrar si el email existía.
    const passwordHash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await verifyPassword(password, passwordHash).catch(() => false);
    if (!user || !ok) {
      throw new HTTPException(401, { message: 'invalid_credentials' });
    }

    const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });
    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    c.header('Set-Cookie', cookie.serialize(), { append: true });

    // Enriquecer sesión con user agent + hash de IP para la UI multi-sesión.
    // IP crudo NO se guarda (GDPR) — solo SHA-256 para distinguir sesiones.
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16);
    const userAgent = c.req.header('user-agent')?.slice(0, 500) ?? null;
    await db.update(sessions).set({ userAgent, ipHash }).where(eq(sessions.id, session.id));

    // Fire-and-forget: no bloquea la respuesta.
    void touchLastAccess(env, user.id);

    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarColor: user.avatarColor }
    });
  });

  app.post('/logout', requireAuth, async (c) => {
    const session = c.get('session');
    const env = c.get('env');
    const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });
    if (session) await lucia.invalidateSession(session.id);
    const cookie = lucia.createBlankSessionCookie();
    c.header('Set-Cookie', cookie.serialize(), { append: true });
    return c.json({ ok: true });
  });

  app.get('/session', noCache, (c) => {
    const user = c.get('user');
    if (!user) return c.json({ user: null });
    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarColor: user.avatarColor }
    });
  });

  // ─── GET /auth/sessions ────────────────────────────────────────
  // Lista las sesiones activas del usuario actual con device info.
  app.get('/sessions', requireAuth, noCache, async (c) => {
    const env = c.get('env');
    const user = c.get('user')!;
    const currentSession = c.get('session')!;
    const db = getDb(env.DATABASE_URL);
    const now = new Date();

    const rows = await db
      .select()
      .from(sessions)
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

  // ─── DELETE /auth/sessions/:id ─────────────────────────────────
  // Cierra UNA sesión del usuario (debe ser suya). Útil para "cerrar
  // sesión en otro dispositivo".
  app.delete('/sessions/:id', requireAuth, async (c) => {
    const env = c.get('env');
    const user = c.get('user')!;
    const sessionId = c.req.param('id');
    const db = getDb(env.DATABASE_URL);

    const target = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
    if (!target || target.userId !== user.id) throw new HTTPException(404, { message: 'not_found' });

    const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });
    await lucia.invalidateSession(sessionId);
    return c.json({ ok: true });
  });

  // ─── DELETE /auth/sessions ─────────────────────────────────────
  // Cierra TODAS las sesiones del usuario excepto la actual.
  app.delete('/sessions', requireAuth, async (c) => {
    const env = c.get('env');
    const user = c.get('user')!;
    const current = c.get('session')!;
    const db = getDb(env.DATABASE_URL);

    const all = await db.query.sessions.findMany({ where: eq(sessions.userId, user.id) });
    const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });
    await Promise.all(
      all.filter(s => s.id !== current.id).map(s => lucia.invalidateSession(s.id))
    );
    return c.json({ ok: true, closed: all.length - 1 });
  });

  // ─── POST /auth/forgot ─────────────────────────────────────────
  // Idempotente: siempre devuelve 200 (no revela si el email existe).
  // Rate limit: 3 intentos/hora por IP+email para evitar bombing.
  const forgotRateLimit = rateLimit({
    bucket: 'auth-forgot',
    limit: 3,
    windowSeconds: 3600,
    keyFn: async (c: any) => {
      const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      try {
        const body = await c.req.raw.clone().json();
        return `${ip}:${(body.email ?? '').toLowerCase()}`;
      } catch { return ip; }
    }
  });

  app.post('/forgot',
    forgotRateLimit,
    zValidator('json', z.object({ email: z.string().email() })),
    async (c) => {
      const { email } = c.req.valid('json');
      const env = c.get('env');
      const db = getDb(env.DATABASE_URL);
      const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });

      if (user) {
        // Invalidar tokens de reset pendientes (solo uno activo a la vez).
        await invalidateUserTokens(env, user.id, 'password_reset');
        const token = await createToken(env, { userId: user.id, kind: 'password_reset', ttlSeconds: 60 * 60 });
        const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
        const tpl = passwordResetTemplate({ name: user.name, resetUrl });
        void getEmailProvider(env).send({ to: user.email, ...tpl })
          .catch(err => console.error('[auth] forgot email failed:', err));
      }

      // Siempre OK — no filtrar si el email existe.
      return c.json({ ok: true });
    }
  );

  // ─── POST /auth/reset ──────────────────────────────────────────
  // Consume password_reset token y setea la nueva password.
  app.post('/reset',
    zValidator('json', z.object({
      token: z.string().min(16),
      newPassword: z.string().min(8).max(200)
    })),
    async (c) => {
      const { token, newPassword } = c.req.valid('json');
      const env = c.get('env');
      const db = getDb(env.DATABASE_URL);
      const userId = await consumeToken(env, token, 'password_reset');
      if (!userId) throw new HTTPException(400, { message: 'invalid_or_expired_token' });

      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      const check = checkPasswordStrength({
        password: newPassword,
        userInputs: u ? [u.email, u.name] : []
      });
      if (!check.ok) throw new HTTPException(400, { message: check.reason ?? 'weak_password' });

      const passwordHash = await hashPassword(newPassword);
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

      // Invalidar TODAS las sesiones activas del usuario (seguridad).
      const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });
      await lucia.invalidateUserSessions(userId);

      return c.json({ ok: true });
    }
  );

  // ─── POST /auth/set-password ───────────────────────────────────
  // Consume password_setup token (welcome email) y setea la primera password.
  // Mismo endpoint y shape que /reset pero valida distinta kind.
  app.post('/set-password',
    zValidator('json', z.object({
      token: z.string().min(16),
      newPassword: z.string().min(8).max(200)
    })),
    async (c) => {
      const { token, newPassword } = c.req.valid('json');
      const env = c.get('env');
      const db = getDb(env.DATABASE_URL);
      const userId = await consumeToken(env, token, 'password_setup');
      if (!userId) throw new HTTPException(400, { message: 'invalid_or_expired_token' });

      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      const check = checkPasswordStrength({
        password: newPassword,
        userInputs: u ? [u.email, u.name] : []
      });
      if (!check.ok) throw new HTTPException(400, { message: check.reason ?? 'weak_password' });

      const passwordHash = await hashPassword(newPassword);
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

      return c.json({ ok: true });
    }
  );

  return app;
}

/**
 * Heurística muy simple para detectar device/browser del user-agent.
 * No es perfecto, pero suficiente para mostrarle al editor "MacBook · Chrome".
 */
function parseDeviceHint(ua: string | null): string {
  if (!ua) return 'Desconocido';
  const lower = ua.toLowerCase();
  const browser = lower.includes('firefox') ? 'Firefox'
    : lower.includes('edg/') ? 'Edge'
    : lower.includes('chrome') && !lower.includes('chromium') ? 'Chrome'
    : lower.includes('safari') ? 'Safari'
    : 'Browser';
  const os = lower.includes('iphone') ? 'iPhone'
    : lower.includes('ipad') ? 'iPad'
    : lower.includes('android') ? 'Android'
    : lower.includes('mac os') || lower.includes('macintosh') ? 'macOS'
    : lower.includes('windows') ? 'Windows'
    : lower.includes('linux') ? 'Linux'
    : 'Desconocido';
  return `${os} · ${browser}`;
}
