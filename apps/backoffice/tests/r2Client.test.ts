import { afterEach, describe, expect, it, vi } from 'vitest';
import { R2Client, parseListObjects } from '@/core/media';

// Sin red: se sustituye `fetch` y se mira qué petición S3 sale y cómo se lee la respuesta.
const env = {
  R2_ACCOUNT_ID: 'acc',
  R2_ACCESS_KEY_ID: 'key-id',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'bucket'
};
const BUCKET_URL = 'https://acc.r2.cloudflarestorage.com/bucket';

function stubFetch(...responses: Response[]) {
  const calls: Request[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: Request) => {
    calls.push(input);
    return responses.shift() ?? new Response(null, { status: 500 });
  }));
  return calls;
}

const listXml = (items: string, extra = '') =>
  `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult>${items}${extra}</ListBucketResult>`;
const item = (key: string, date: string, size: number) =>
  `<Contents><Key>${key}</Key><LastModified>${date}</LastModified><ETag>&quot;x&quot;</ETag><Size>${size}</Size></Contents>`;

afterEach(() => vi.unstubAllGlobals());

describe('R2Client', () => {
  it('head: HEAD firmado al objeto; devuelve tamaño y tipo', async () => {
    const calls = stubFetch(new Response(null, { status: 200, headers: { 'content-length': '1234', 'content-type': 'image/webp' } }));
    const result = await new R2Client(env).head('pruebas/foto.webp');
    expect(result).toEqual({ sizeBytes: 1234, contentType: 'image/webp' });
    expect(calls[0].method).toBe('HEAD');
    expect(calls[0].url).toBe(`${BUCKET_URL}/pruebas/foto.webp`);
    expect(calls[0].headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=key-id\/\d{8}\/auto\/s3\/aws4_request/);
  });

  it('head: 404 es «no existe», no un error', async () => {
    stubFetch(new Response(null, { status: 404 }));
    expect(await new R2Client(env).head('no-existe')).toBeNull();
  });

  it('head: otro fallo se propaga', async () => {
    stubFetch(new Response('AccessDenied', { status: 403 }));
    await expect(new R2Client(env).head('x')).rejects.toThrow(/R2 HEAD x: 403/);
  });

  it('delete: DELETE al objeto y no falla si ya no estaba', async () => {
    const calls = stubFetch(new Response(null, { status: 204 }), new Response(null, { status: 404 }));
    const r2 = new R2Client(env);
    await r2.delete('a/b.webp');
    await r2.delete('a/b.webp');
    expect(calls.map(c => `${c.method} ${c.url}`)).toEqual([
      `DELETE ${BUCKET_URL}/a/b.webp`,
      `DELETE ${BUCKET_URL}/a/b.webp`
    ]);
  });

  it('put: cuerpo, tipo y metadatos', async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));
    await new R2Client(env).put('backups/2026-11-22.json', '{"a":1}', {
      contentType: 'application/json',
      metadata: { 'row-count': '7' }
    });
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url).toBe(`${BUCKET_URL}/backups/2026-11-22.json`);
    expect(calls[0].headers.get('content-type')).toBe('application/json');
    expect(calls[0].headers.get('x-amz-meta-row-count')).toBe('7');
    expect(await calls[0].text()).toBe('{"a":1}');
  });

  it('list: sigue las páginas hasta el final', async () => {
    const calls = stubFetch(
      new Response(listXml(item('backups/2026-10-01.json', '2026-10-01T03:00:05.000Z', 10),
        '<IsTruncated>true</IsTruncated><NextContinuationToken>tok/1=</NextContinuationToken>')),
      new Response(listXml(item('backups/2026-10-02.json', '2026-10-02T03:00:05.000Z', 20), '<IsTruncated>false</IsTruncated>'))
    );
    const objects = await new R2Client(env).list('backups/');
    expect(objects).toEqual([
      { key: 'backups/2026-10-01.json', sizeBytes: 10, uploadedAt: new Date('2026-10-01T03:00:05.000Z') },
      { key: 'backups/2026-10-02.json', sizeBytes: 20, uploadedAt: new Date('2026-10-02T03:00:05.000Z') }
    ]);
    const first = new URL(calls[0].url);
    expect(first.origin + first.pathname).toBe(BUCKET_URL);
    expect(first.searchParams.get('list-type')).toBe('2');
    expect(first.searchParams.get('prefix')).toBe('backups/');
    expect(new URL(calls[1].url).searchParams.get('continuation-token')).toBe('tok/1=');
  });

  it('signUploadUrl: URL de PUT firmada en la query, con caducidad', async () => {
    const url = new URL(await new R2Client(env).signUploadUrl('pruebas/foto.webp', 'image/webp', 300));
    expect(url.origin + url.pathname).toBe(`${BUCKET_URL}/pruebas/foto.webp`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('parseListObjects', () => {
  it('lista vacía y claves con entidades XML', () => {
    expect(parseListObjects(listXml(''))).toEqual([]);
    expect(parseListObjects(listXml(item('a&amp;b.json', '2026-01-01T00:00:00.000Z', 1)))[0].key).toBe('a&b.json');
  });
});
