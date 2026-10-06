import type { RebuildHookCaller } from '../../domain/services/rebuildHookCaller.js';

export class FetchRebuildHookCaller implements RebuildHookCaller {
  async call(url: string, meta?: { restaurantSlug?: string }): Promise<void> {
    const label = meta?.restaurantSlug ? `[rebuild:${meta.restaurantSlug}]` : '[rebuild]';
    // 3s basta para que el provider acuse recibo; el rebuild real sigue
    // corriendo de su lado aunque abortemos aquí.
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
