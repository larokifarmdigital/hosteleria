import { Hono } from 'hono';
import { validate } from '../validate.js';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware.js';
import { rateLimit } from '../../../middleware/rate-limit.js';
import { noCache } from '../../../middleware/cache.js';
import { parseDeviceHint } from '../deviceHint.js';
import { extractIp } from '../httpUtils.js';
import type { AppBindings } from '../types.js';

export function createAuthRoutes() {
  const app = new Hono<AppBindings>();

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
    validate('json', z.object({ email: z.string().email(), password: z.string().min(1) })),
    async (c) => {
      const { login } = c.get('container').auth;
      const result = await login.execute(c.req.valid('json'), {
        ip: extractIp(c.req.raw.headers),
        userAgent: c.req.header('user-agent') ?? null
      });
      c.header('Set-Cookie', result.cookieHeader, { append: true });
      return c.json({ user: result.user });
    }
  );

  // ─── POST /auth/logout ────────────────────────────────────────────
  app.post('/logout', requireAuth, async (c) => {
    const session = c.get('session');
    const { logout } = c.get('container').auth;
    const { cookieHeader } = await logout.execute(session?.id ?? null);
    c.header('Set-Cookie', cookieHeader, { append: true });
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
  app.get('/sessions', requireAuth, noCache, async (c) => {
    const user = c.get('user')!;
    const current = c.get('session')!;
    const sessions = await c.get('container').auth.listSessions.execute(user.id);
    return c.json({
      sessions: sessions.map(s => ({
        id: s.id,
        userAgent: s.userAgent,
        deviceHint: parseDeviceHint(s.userAgent),
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: s.id === current.id
      }))
    });
  });

  // ─── DELETE /auth/sessions/:id ────────────────────────────────────
  app.delete('/sessions/:id', requireAuth, async (c) => {
    const user = c.get('user')!;
    const sessionId = c.req.param('id');
    await c.get('container').auth.revokeSession.execute(user.id, sessionId);
    return c.json({ ok: true });
  });

  // ─── DELETE /auth/sessions ────────────────────────────────────────
  app.delete('/sessions', requireAuth, async (c) => {
    const user = c.get('user')!;
    const current = c.get('session')!;
    const { closed } = await c.get('container').auth.revokeOthers.execute(user.id, current.id);
    return c.json({ ok: true, closed });
  });

  // ─── POST /auth/forgot ────────────────────────────────────────────
  // Siempre 200 — no revelamos si el email está en BD (lo gestiona el UC).
  app.post('/forgot',
    forgotRateLimit,
    validate('json', z.object({ email: z.string().email() })),
    async (c) => {
      await c.get('container').auth.requestPasswordReset.execute(c.req.valid('json').email);
      return c.json({ ok: true });
    }
  );

  // ─── POST /auth/reset ─────────────────────────────────────────────
  app.post('/reset',
    validate('json', z.object({ token: z.string().min(16), newPassword: z.string().min(8).max(200) })),
    async (c) => {
      await c.get('container').auth.applyPasswordChange.execute({
        ...c.req.valid('json'),
        kind: 'password_reset'
      });
      return c.json({ ok: true });
    }
  );

  // ─── POST /auth/set-password ─────────────────────────────────────
  // Mismo flujo que /reset, pero el token es `password_setup` (welcome email).
  app.post('/set-password',
    validate('json', z.object({ token: z.string().min(16), newPassword: z.string().min(8).max(200) })),
    async (c) => {
      await c.get('container').auth.applyPasswordChange.execute({
        ...c.req.valid('json'),
        kind: 'password_setup'
      });
      return c.json({ ok: true });
    }
  );

  return app;
}

/**
 * Clave compuesta IP+email para que un atacante no pueda saturar a un email
 * ajeno desde su IP ni gastar su propio cupo rápido.
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
