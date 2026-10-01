/**
 * Dispara el Vercel Deploy Hook de una landing — fire-and-forget.
 *
 * Vercel Deploy Hook URL formato:
 *   https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy
 *
 * El POST sin body basta para disparar el rebuild (Vercel ignora el body).
 *
 * Timeout corto (3s): si el hook no responde rápido, lo dejamos ir y
 * logueamos. No bloqueamos la respuesta del api al editor.
 */
export async function fireRebuildHook(url: string, meta?: { restaurantSlug?: string }): Promise<void> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(url, { method: 'POST', signal: ctrl.signal });
    const label = meta?.restaurantSlug ? `[rebuild:${meta.restaurantSlug}]` : '[rebuild]';
    if (res.ok) {
      console.log(`${label} hook OK (${res.status})`);
    } else {
      console.error(`${label} hook failed (${res.status})`);
    }
  } catch (err) {
    const label = meta?.restaurantSlug ? `[rebuild:${meta.restaurantSlug}]` : '[rebuild]';
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error(`${label} hook error: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }
}
