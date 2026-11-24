import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protección frente a CSRF: una escritura solo vale si viene del propio backoffice.
 *
 * Un formulario o un `fetch` sin preflight desde otra web llegan con la cookie de
 * sesión si el navegador la envía; aquí se paran por dos lados:
 *  - el origen: `Sec-Fetch-Site` (lo pone el navegador, una página no puede falsearlo)
 *    y, donde no exista, `Origin` contra el host de la petición;
 *  - el tipo de contenido: sin preflight solo se pueden enviar formularios y texto
 *    plano, así que un cuerpo que no sea JSON se rechaza.
 * Las llamadas del propio servidor (RSC, server actions, scripts) no llevan estas
 * cabeceras y pasan.
 */
export const requireSameOrigin = createMiddleware(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();

  const site = c.req.header('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    throw new HTTPException(403, { message: 'CROSS_SITE_REQUEST' });
  }

  const origin = c.req.header('origin');
  if (origin) {
    const host = c.req.header('x-forwarded-host') ?? c.req.header('host');
    let originHost: string | null = null;
    try { originHost = new URL(origin).host; } catch { /* `Origin: null` y similares */ }
    if (!host || originHost !== host) throw new HTTPException(403, { message: 'CROSS_SITE_REQUEST' });
  }

  const contentType = c.req.header('content-type');
  if (contentType && !contentType.toLowerCase().startsWith('application/json')) {
    throw new HTTPException(415, { message: 'UNSUPPORTED_MEDIA_TYPE' });
  }

  return next();
});
