import type { SiteBuildInfo, SiteProbe } from '../domain/services/siteProbe';

const MAX_REDIRECTS = 3;

// El api llama por su cuenta a la dirección que guarda el restaurante: una redirección
// podría mandarlo a otra máquina. Solo se siguen las que se quedan en el mismo dominio
// (con o sin «www.») y en https, que es lo normal en una web publicada.
function sameSite(from: URL, to: URL): boolean {
  const bare = (host: string) => host.replace(/^www\./, '');
  return to.protocol === 'https:' && to.port === '' && bare(to.hostname) === bare(from.hostname);
}

export class FetchSiteProbe implements SiteProbe {
  async read(siteUrl: string): Promise<SiteBuildInfo | null> {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    try {
      const origin = new URL(siteUrl);
      // El parámetro evita que una caché intermedia devuelva el archivo de un build anterior.
      let url = new URL(`/build.json?t=${Date.now()}`, origin);
      for (let hop = 0; ; hop++) {
        const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual', headers: { accept: 'application/json' } });
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (!location || hop >= MAX_REDIRECTS) return null;
          const next = new URL(location, url);
          if (!sameSite(origin, next)) return null;
          url = next;
          continue;
        }
        if (!res.ok) return null;
        const body = await res.json() as Partial<SiteBuildInfo>;
        return {
          version: typeof body.version === 'string' ? body.version : null,
          builtAt: typeof body.builtAt === 'string' ? body.builtAt : null
        };
      }
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
