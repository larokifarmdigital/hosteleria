import * as Sentry from '@sentry/cloudflare';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../env.js';

/**
 * Observability — reporta errores no esperados a Sentry.
 *
 * **@sentry/cloudflare** se inicializa envolviendo el handler default del
 * Worker con `Sentry.withSentry(configFn, handler)` — ver `src/index.ts`.
 * Si `SENTRY_DSN` no está seteado, `withSentry` es un no-op.
 *
 * Este middleware solo loggea excepciones con context extra (user, path,
 * method) y las re-lanza para que Sentry las capture en el wrapper.
 */

/**
 * Dónde se usa:
 *  - `app.ts` → se monta como middleware global.
 */
export function sentryMiddleware() {
  return createMiddleware<{ Bindings: Env; Variables: Record<string, unknown> }>(async (c, next) => {
    try {
      await next();
    } catch (err) {
      const isExpectedHttp = err instanceof HTTPException && err.status < 500;
      if (!isExpectedHttp) {
        const user = c.get('user') as { id: string; email: string } | null | undefined;
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
