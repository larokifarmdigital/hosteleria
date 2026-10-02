import * as Sentry from '@sentry/node';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AuthVars } from '../auth/middleware.js';
import type { Env } from '../env.js';

let initialized = false;

/**
 * Inicializa Sentry si hay DSN configurado. Idempotente.
 * Se llama al construir la Hono app.
 */
export function initSentry(env: Env) {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV,
    release: '0.0.1',
    // Capturar 10% de transactions en prod, 100% en dev
    tracesSampleRate: env.SENTRY_ENV === 'production' ? 0.1 : 1.0,
    // No enviar bodies de requests ni headers con cookies
    sendDefaultPii: false,
    beforeSend(event) {
      // Scrub cookies / auth headers aunque sendDefaultPii sea false
      if (event.request?.headers) {
        delete (event.request.headers as any).cookie;
        delete (event.request.headers as any).authorization;
      }
      return event;
    }
  });
  initialized = true;
}

/**
 * Middleware que captura errores en Sentry con context del request.
 * Las HTTPException de Hono (401/403/404/429) NO se envían — son
 * esperables, no bugs. Solo 500+ y errores sin status llegan a Sentry.
 */
export function sentryMiddleware() {
  return createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
    try {
      await next();
    } catch (err) {
      const isExpectedHttp = err instanceof HTTPException && err.status < 500;
      if (!isExpectedHttp && initialized) {
        const user = c.get('user');
        Sentry.withScope((scope) => {
          scope.setTag('path', c.req.path);
          scope.setTag('method', c.req.method);
          if (user) scope.setUser({ id: user.id, email: user.email });
          Sentry.captureException(err);
        });
      }
      throw err;
    }
  });
}
