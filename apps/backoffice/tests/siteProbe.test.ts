import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchSiteProbe } from '../src/core/site/infrastructure/fetchSiteProbe';

const build = { version: 'v1', builtAt: '2026-11-22T11:00:00Z' };
const redirect = (location: string) => new Response(null, { status: 301, headers: { location } });
const ok = () => new Response(JSON.stringify(build), { status: 200, headers: { 'content-type': 'application/json' } });

function serve(...responses: Response[]) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: URL, init: RequestInit) => {
    expect(init.redirect).toBe('manual');
    calls.push(url.toString());
    return responses.shift()!;
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('FetchSiteProbe', () => {
  it('lee build.json de la web', async () => {
    serve(ok());
    expect(await new FetchSiteProbe().read('https://mirestaurante.com')).toEqual(build);
  });

  it('sigue la redirección a www y de vuelta dentro del mismo dominio', async () => {
    const calls = serve(redirect('https://www.mirestaurante.com/build.json'), ok());
    expect(await new FetchSiteProbe().read('https://mirestaurante.com')).toEqual(build);
    expect(calls[1]).toBe('https://www.mirestaurante.com/build.json');
  });

  it('no sigue una redirección a otro dominio, a http, a otro puerto ni a una IP', async () => {
    for (const to of ['https://otro.example/build.json', 'http://mirestaurante.com/build.json', 'https://mirestaurante.com:8443/build.json', 'http://169.254.169.254/latest/meta-data']) {
      const calls = serve(redirect(to), ok());
      expect(await new FetchSiteProbe().read('https://mirestaurante.com')).toBeNull();
      expect(calls).toHaveLength(1);
    }
  });

  it('corta una cadena de redirecciones demasiado larga', async () => {
    const hop = () => redirect('https://www.mirestaurante.com/build.json');
    const calls = serve(hop(), hop(), hop(), hop(), ok());
    expect(await new FetchSiteProbe().read('https://mirestaurante.com')).toBeNull();
    expect(calls).toHaveLength(4);
  });
});
