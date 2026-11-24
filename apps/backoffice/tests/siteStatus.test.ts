import { describe, it, expect } from 'vitest';
import { REBUILD_GRACE_MS, resolveSiteState, siteUrlOf, siteVersion } from '@/core/site/domain';

const now = new Date('2026-11-22T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const state = (over: Partial<Parameters<typeof resolveSiteState>[0]>) =>
  resolveSiteState({ currentVersion: 'v2', build: { version: 'v1', builtAt: null }, lastRebuildAt: null, lastRebuildOk: null, now, ...over });

describe('estado de la web', () => {
  it('al día cuando la web se construyó con el contenido publicado', () => {
    expect(state({ build: { version: 'v2', builtAt: null } })).toBe('up_to_date');
  });

  it('actualizándose si se pidió regenerar hace poco y el hook aceptó', () => {
    expect(state({ lastRebuildAt: ago(60_000), lastRebuildOk: true })).toBe('updating');
  });

  it('desfasada si ya pasó el margen, si el hook falló o si nunca se pidió', () => {
    expect(state({ lastRebuildAt: ago(REBUILD_GRACE_MS + 1000), lastRebuildOk: true })).toBe('outdated');
    expect(state({ lastRebuildAt: ago(60_000), lastRebuildOk: false })).toBe('outdated');
    expect(state({})).toBe('outdated');
  });

  it('sin información de la web no se afirma nada', () => {
    expect(state({ build: null })).toBe('unknown');
    expect(state({ build: { version: null, builtAt: '2026-11-22T11:00:00Z' } })).toBe('unknown');
  });

  it('la versión cambia con el contenido y no con el orden en que se pida', () => {
    const site = { restaurant: { name: 'A' }, spaces: [], legalPages: [], media: {} } as never;
    expect(siteVersion(site)).toBe(siteVersion(JSON.parse(JSON.stringify(site))));
    expect(siteVersion(site)).not.toBe(siteVersion({ ...(site as object), restaurant: { name: 'B' } } as never));
    expect(siteVersion(site)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('solo se consulta un dominio público', () => {
    expect(siteUrlOf('www.lapubilladeltaulat.es')).toBe('https://www.lapubilladeltaulat.es');
    expect(siteUrlOf('https://Guixot.cat/')).toBe('https://guixot.cat');
    for (const bad of ['localhost', '10.0.0.1', '169.254.169.254', 'api.internal', 'pruebas.local', 'a b.com', 'x.com/ruta', '']) {
      expect(siteUrlOf(bad)).toBeNull();
    }
  });
});
