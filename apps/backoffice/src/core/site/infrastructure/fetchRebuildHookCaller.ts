import type { RebuildHookCaller } from '../domain/services/rebuildHookCaller';

export class FetchRebuildHookCaller implements RebuildHookCaller {
  async call(url: string, meta?: { restaurantSlug?: string }): Promise<boolean> {
    const label = meta?.restaurantSlug ? `[rebuild:${meta.restaurantSlug}]` : '[rebuild]';
    // El hook de Vercel tarda a veces más de 3 s en acusar recibo desde Workers.
    // Esta llamada va después de responder al editor, así que puede esperar.
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(url, { method: 'POST', signal: ctrl.signal });
      if (res.ok) console.log(`${label} hook OK (${res.status})`);
      else console.error(`${label} hook failed (${res.status})`);
      return res.ok;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.error(`${label} hook error: ${msg}`);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
