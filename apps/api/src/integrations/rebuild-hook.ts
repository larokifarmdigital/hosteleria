/**
 * Dispara el "deploy hook" de la landing de un restaurante.
 *
 * Cuando el editor publica cambios desde el backoffice, la landing Astro
 * del restaurante (ej. casabella.cat) tiene que re-buildearse para que
 * esos cambios aparezcan en producción. Cada landing tiene un deploy hook
 * (URL que al recibir POST dispara un rebuild) guardado en
 * `restaurants.rebuild_hook_url`.
 *
 * **Fire-and-forget**: no bloqueamos la respuesta del api al editor.
 * Timeout de 3 segundos — si el hook tarda más, lo abandonamos y
 * logueamos. El rebuild sigue corriendo del lado del provider.
 *
 * Dónde se usa:
 *  - `routes/restaurants.ts` → POST /restaurants/:slug/publish.
 */
export async function fireRebuildHook(url: string, meta?: { restaurantSlug?: string }): Promise<void> {
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
