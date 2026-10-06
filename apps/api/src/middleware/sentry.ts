import * as Sentry from '@sentry/cloudflare';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../env.js';

/**
 * El init de Sentry vive en `src/index.ts` (`Sentry.withSentry`). Aquí solo
 * añadimos contexto (user, path, method) y re-lanzamos. 4xx no se reporta —
 * son errores del cliente, no del server.
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
