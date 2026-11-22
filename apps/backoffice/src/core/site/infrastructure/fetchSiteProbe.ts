import type { SiteBuildInfo, SiteProbe } from '../domain/services/siteProbe';

export class FetchSiteProbe implements SiteProbe {
  async read(siteUrl: string): Promise<SiteBuildInfo | null> {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    try {
      // El parámetro evita que una caché intermedia devuelva el archivo de un build anterior.
      const res = await fetch(`${siteUrl}/build.json?t=${Date.now()}`, {
        signal: ctrl.signal, redirect: 'follow', headers: { accept: 'application/json' }
      });
      if (!res.ok) return null;
      const body = await res.json() as Partial<SiteBuildInfo>;
      return {
        version: typeof body.version === 'string' ? body.version : null,
        builtAt: typeof body.builtAt === 'string' ? body.builtAt : null
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
