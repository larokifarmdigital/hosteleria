/**
 * Test de integración — llama a la app Hono directamente con
 * `app.request()` (sin arrancar un servidor HTTP). Usa la BD real
 * declarada en DATABASE_URL — recomendación: una branch Neon aparte
 * (`test`) para no tocar `production`.
 *
 * Si DATABASE_URL no está, el test se skip-ea.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';

const hasDb = !!process.env.DATABASE_URL;
const describeIntegration = hasDb ? describe : describe.skip;

describeIntegration('auth integration', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it('GET /health responde 200 y db:connected', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; db: string };
    expect(body.ok).toBe(true);
    expect(body.db).toBe('connected');
  });

  it('POST /auth/login con credenciales inválidas → 401', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.100' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong1234' })
    });
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('invalid_credentials');
  });

  it('GET /auth/session sin cookie → user: null', async () => {
    const res = await app.request('/auth/session');
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });

  it('GET /restaurants sin auth → 401', async () => {
    const res = await app.request('/restaurants');
    expect(res.status).toBe(401);
  });

  it('POST /auth/forgot con email inexistente → 200 (no revela existencia)', async () => {
    const res = await app.request('/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.101' },
      body: JSON.stringify({ email: 'ghost-user@nowhere.com' })
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
