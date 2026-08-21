/**
 * Cloudflare Worker — Sanity → Vercel dispatcher
 *
 * Recibe UN solo webhook de Sanity y enruta el rebuild al Vercel Deploy Hook
 * del restaurante afectado. Permite tener los 5 restaurantes (o más) con solo
 * 1 webhook consumido en Sanity (Free tier permite 2).
 *
 * Flujo:
 *   Sanity publish → 1 webhook → este Worker → 1 Vercel Deploy Hook específico
 *
 * Env vars requeridas (configurar en Cloudflare Worker settings):
 *   SANITY_SECRET       — secret compartido para validar el webhook (obligatorio)
 *   HOOK_CASABELLA      — Vercel Deploy Hook URL de Casabella
 *   HOOK_GUIXOT         — Vercel Deploy Hook URL de Guixot
 *   HOOK_LA_PRINCIPAL   — Vercel Deploy Hook URL de La Principal
 *   HOOK_PUBILLA        — Vercel Deploy Hook URL de La Pubilla
 *   HOOK_ROURE          — Vercel Deploy Hook URL de Roure
 *
 * Cualquier HOOK_* que falte simplemente se ignora (200 OK, no dispara nada).
 */

// Slugs conocidos del monorepo. El orden importa: los más largos primero para
// que "la-principal" no matchee como "principal" (o similar edge cases).
const KNOWN_SLUGS = ['la-principal', 'casabella', 'guixot', 'pubilla', 'roure'];

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return json({ ok: true, service: 'sanity-dispatcher' });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // ── Autenticación por secret compartido ─────────────────────────────
    // Sanity envía el secret en el header `sanity-webhook-signature`
    // (verificación HMAC) o como Basic Auth. Aquí usamos un secret simple
    // en el query string para simplicidad — Sanity lo permite pasar via URL.
    // Alternativamente usar el header custom `x-sanity-secret`.
    const url = new URL(request.url);
    const providedSecret =
      url.searchParams.get('secret') || request.headers.get('x-sanity-secret');
    if (!env.SANITY_SECRET) {
      return json({ error: 'Worker missing SANITY_SECRET env var' }, 500);
    }
    if (providedSecret !== env.SANITY_SECRET) {
      return json({ error: 'Invalid or missing secret' }, 401);
    }

    // ── Parseo del payload de Sanity ────────────────────────────────────
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    // ── Detectar restaurante afectado ───────────────────────────────────
    const slug = detectRestaurantSlug(payload);
    if (!slug) {
      // No es un doc de restaurante o no se pudo identificar → no rebuild
      return json({ ok: true, action: 'ignored', reason: 'no restaurant detected', payload });
    }

    // ── Mapeo slug → env var del Deploy Hook ─────────────────────────────
    const hookMap = {
      casabella: env.HOOK_CASABELLA,
      guixot: env.HOOK_GUIXOT,
      'la-principal': env.HOOK_LA_PRINCIPAL,
      pubilla: env.HOOK_PUBILLA,
      roure: env.HOOK_ROURE
    };
    const hookUrl = hookMap[slug];
    if (!hookUrl) {
      return json({ ok: true, action: 'ignored', reason: `no deploy hook configured for '${slug}'`, slug });
    }

    // ── Disparar Vercel Deploy Hook ─────────────────────────────────────
    // Vercel Deploy Hooks aceptan POST vacío. Devuelven { job: { id } }.
    let vercelStatus, vercelBody;
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      vercelStatus = res.status;
      vercelBody = await res.text();
    } catch (err) {
      return json({ error: 'Failed to reach Vercel', message: String(err), slug }, 502);
    }

    return json({
      ok: true,
      action: 'deploy_triggered',
      restaurant: slug,
      vercel: { status: vercelStatus, body: vercelBody }
    });
  }
};

/**
 * Detecta el slug del restaurante desde el payload del webhook Sanity.
 *
 * Sanity webhooks envían la projection GROQ que configures. Este worker
 * espera una projection tipo:
 *   {
 *     "_id": _id,
 *     "_type": _type,
 *     "slug": slug,
 *     "restaurante": restaurante
 *   }
 * Con eso puede detectar el restaurante desde varios ángulos.
 */
function detectRestaurantSlug(payload) {
  if (!payload || typeof payload !== 'object') return null;

  // Caso 1: doc "restaurante" con slug directo
  if (payload._type === 'restaurante' && payload.slug?.current) {
    return payload.slug.current;
  }

  // Caso 2: docs relacionados (categoriaPlato, plato, categoriaVino, vino,
  // paginaLegal, resena) con referencia `restaurante._ref`.
  // El _ref del doc restaurante en nuestro seed es "restaurante-<slug>".
  const ref = payload.restaurante?._ref;
  if (typeof ref === 'string' && ref.startsWith('restaurante-')) {
    const rest = ref.slice('restaurante-'.length);
    // Buscar el slug conocido más largo que empate (evita split ambiguo)
    for (const s of KNOWN_SLUGS) {
      if (rest === s) return s;
    }
  }

  // Caso 3: match por _id del doc (fallback). Convenciones en el seed:
  //   "restaurante-<slug>"
  //   "paginaLegal-<slug>-*"
  //   "catPlato-<slug>-*", "catVino-<slug>-*"
  //   "vino-<slug>-*", "plato-<slug>-*"
  const id = payload._id || '';
  if (typeof id === 'string') {
    for (const s of KNOWN_SLUGS) {
      if (id === `restaurante-${s}` || id.includes(`-${s}-`) || id.endsWith(`-${s}`)) {
        return s;
      }
    }
  }

  return null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
