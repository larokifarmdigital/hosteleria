import { Hono } from 'hono';
import { validate } from '../validate';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rate-limit';
import { noCache } from '../middleware/cache';
import { parseDeviceHint } from '../deviceHint';
import { extractIp } from '../httpUtils';
import type { AppBindings } from '../types';

export function createAuthRoutes() {
  const app = new Hono<AppBindings>();

  const loginRateLimit = rateLimit({
    bucket: 'auth-login',
    limit: 5,
    windowSeconds: 3600,
    keyFn: async (c: any) => keyByIpAndBodyEmail(c)
  });
  // Tope por cuenta, venga de donde venga: cambiando de IP el límite anterior no frena
  // a quien prueba contraseñas. Más alto, para que no sea fácil dejar a alguien sin entrar.
  const loginAccountRateLimit = rateLimit({
    bucket: 'auth-login-account',
    limit: 20,
    windowSeconds: 3600,
    keyFn: async (c: any) => {
      try { return `email:${String((await c.req.raw.clone().json()).email ?? '').toLowerCase()}`; }
      catch { return 'email:'; }
    }
  });
  const forgotRateLimit = rateLimit({
    bucket: 'auth-forgot',
    limit: 3,
    windowSeconds: 3600,
    keyFn: async (c: any) => keyByIpAndBodyEmail(c)
  });

  app.post('/login',
    loginRateLimit,
    loginAccountRateLimit,
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

  app.post('/logout', requireAuth, async (c) => {
    const session = c.get('session');
    const { logout } = c.get('container').auth;
    const { cookieHeader } = await logout.execute(session?.id ?? null);
    c.header('Set-Cookie', cookieHeader, { append: true });
    return c.json({ ok: true });
  });

  app.get('/session', noCache, (c) => {
    const user = c.get('user');
    if (!user) return c.json({ user: null });
    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarColor: user.avatarColor }
    });
  });

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

  app.delete('/sessions/:id', requireAuth, async (c) => {
    const user = c.get('user')!;
    const sessionId = c.req.param('id');
    await c.get('container').auth.revokeSession.execute(user.id, sessionId);
    return c.json({ ok: true });
  });

  app.delete('/sessions', requireAuth, async (c) => {
    const user = c.get('user')!;
    const current = c.get('session')!;
    const { closed } = await c.get('container').auth.revokeOthers.execute(user.id, current.id);
    return c.json({ ok: true, closed });
  });

  // Siempre 200 — no revelamos si el email está en BD (lo gestiona el UC).
  app.post('/forgot',
    forgotRateLimit,
    validate('json', z.object({ email: z.string().email() })),
    async (c) => {
      await c.get('container').auth.requestPasswordReset.execute(c.req.valid('json').email);
      return c.json({ ok: true });
    }
  );

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
