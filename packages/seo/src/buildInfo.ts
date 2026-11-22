import type { APIRoute } from 'astro';

export type CreateBuildInfoOpts = {
  /** Versión del contenido con el que se construye la web; `null` si no se conoce. */
  fetchContentVersion: () => Promise<string | null>;
};

/**
 * `/build.json`: con qué contenido y cuándo se construyó la web. El backoffice lo
 * lee para saber si la web ya enseña lo último publicado.
 */
export function createBuildInfoGET({ fetchContentVersion }: CreateBuildInfoOpts): APIRoute {
  return async () => {
    const body = { version: await fetchContentVersion(), builtAt: new Date().toISOString() };
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  };
}
