import type { RebuildHookCaller } from '../../domain/services/rebuildHookCaller.js';

/**
 * Impl del `RebuildHookCaller` basado en `fetch`.
 *
 * Fire-and-forget: nunca lanza (loguea y sigue). Timeout 3s — si el hook
 * tarda más abandonamos; el provider sigue corriendo el rebuild del lado
 * suyo.
 */
export class FetchRebuildHookCaller implements RebuildHookCaller {
  async call(url: string, meta?: { restaurantSlug?: string }): Promise<void> {
    const label = meta?.restaurantSlug ? `[rebuild:${meta.restaurantSlug}]` : '[rebuild]';
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { method: 'POST', signal: ctrl.signal });
      if (res.ok) console.log(`${label} hook OK (${res.status})`);
      else console.error(`${label} hook failed (${res.status})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.error(`${label} hook error: ${msg}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
