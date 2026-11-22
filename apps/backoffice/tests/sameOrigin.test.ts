import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { requireSameOrigin } from '../src/core/http/middleware/sameOrigin';

const app = new Hono();
app.use('*', requireSameOrigin);
app.get('/x', c => c.json({ ok: true }));
app.post('/x', c => c.json({ ok: true }));
app.patch('/x', c => c.json({ ok: true }));

const call = (method: string, headers: Record<string, string> = {}, body?: string) =>
  app.fetch(new Request('https://backoffice.example/x', { method, headers: { host: 'backoffice.example', ...headers }, body }));

describe('requireSameOrigin', () => {
  it('deja pasar las lecturas vengan de donde vengan', async () => {
    expect((await call('GET', { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' })).status).toBe(200);
  });

  it('deja pasar las escrituras del propio backoffice', async () => {
    const res = await call('POST', { origin: 'https://backoffice.example', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, '{}');
    expect(res.status).toBe(200);
  });

  it('deja pasar las llamadas del servidor, sin cabeceras de navegador', async () => {
    expect((await call('POST')).status).toBe(200);
    expect((await call('PATCH', { 'content-type': 'application/json; charset=utf-8' }, '{}')).status).toBe(200);
  });

  it('rechaza un formulario enviado desde otra web', async () => {
    const res = await call('POST', { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site', 'content-type': 'application/x-www-form-urlencoded' }, 'a=1');
    expect(res.status).toBe(403);
  });

  it('rechaza por el origen aunque falte Sec-Fetch-Site', async () => {
    expect((await call('POST', { origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('POST', { origin: 'null' })).status).toBe(403);
  });

  it('rechaza desde un subdominio hermano', async () => {
    expect((await call('POST', { origin: 'https://fotos.backoffice.example', 'sec-fetch-site': 'same-site' })).status).toBe(403);
  });

  it('rechaza un cuerpo que no sea JSON, que es lo que se puede enviar sin preflight', async () => {
    expect((await call('POST', { 'content-type': 'text/plain' }, '{}')).status).toBe(415);
  });

  it('respeta el host original detrás del proxy', async () => {
    const res = await call('POST', { host: 'interno:3000', 'x-forwarded-host': 'backoffice.example', origin: 'https://backoffice.example' });
    expect(res.status).toBe(200);
  });
});
