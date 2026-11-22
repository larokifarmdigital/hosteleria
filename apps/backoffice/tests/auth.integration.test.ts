// Escribe en BD (rate_limits, sesiones), así que solo corre contra
// TEST_DATABASE_URL (una branch Neon aparte) y nunca contra DATABASE_URL.
// Sin TEST_DATABASE_URL se salta.
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '@/core/http/app';
import type { Env } from '@/core/shared';

const testDbUrl = process.env.TEST_DATABASE_URL;
if (testDbUrl && testDbUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL es igual a DATABASE_URL: usa una branch Neon aparte.');
}
const describeIntegration = testDbUrl ? describe : describe.skip;

// En Workers el env llega por `c.env`; aquí hay que pasarlo a mano. Estos
// tests no tocan R2, por eso el binding MEDIA va vacío.
const env = {
  ...process.env,
  DATABASE_URL: testDbUrl,
  ALLOWED_ORIGIN: 'http://localhost:4400',
  MEDIA: {}
} as unknown as Env;

describeIntegration('auth integration', () => {
  let app: ReturnType<typeof createApp>;
  const request = (path: string, init?: RequestInit) => app.request(path, init, env);

  beforeAll(() => {
    app = createApp();
  });

  it('GET /health responde 200 y db:connected', async () => {
    const res = await request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; db: string };
    expect(body.ok).toBe(true);
    expect(body.db).toBe('connected');
  });

  it('POST /auth/login con credenciales inválidas → 401', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.100' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong1234' })
    });
    expect(res.status).toBe(401);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /auth/session sin cookie → user: null', async () => {
    const res = await request('/auth/session');
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });

  it('GET /restaurants sin auth → 401', async () => {
    const res = await request('/restaurants');
    expect(res.status).toBe(401);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /auth/forgot con email inexistente → 200 (no revela existencia)', async () => {
    const res = await request('/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.101' },
      body: JSON.stringify({ email: 'ghost-user@nowhere.com' })
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
