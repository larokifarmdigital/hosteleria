import * as Sentry from '@sentry/cloudflare';
import type { ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { createApp } from './app.js';
import { runCleanup } from './scheduled/cleanup.js';
import { runBackup } from './scheduled/backup.js';
import { assertEnv, type Env } from './env.js';

/**
 * Entry point del Worker. Cloudflare invoca este archivo con:
 *  - `fetch(request, env, ctx)` → cada request HTTP
 *  - `scheduled(event, env, ctx)` → cada cron trigger
 *
 * El Hono app se crea UNA vez por isolate V8 (no por request), así que
 * siguientes requests son prácticamente gratis.
 *
 * **Sentry**: envolvemos el handler con `Sentry.withSentry(configFn, handler)`.
 * Si `SENTRY_DSN` no está seteado, el wrapper es un no-op.
 */

const app = createApp();

const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    assertEnv(env);
    return app.fetch(request, env, ctx);
  },

  // Cron Triggers — ver wrangler.toml#triggers. `event.cron` indica el
  // schedule exacto así podemos branchear a la tarea correcta.
  // `ctx.waitUntil` extiende el lifetime del Worker hasta que la promesa resuelve.
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    assertEnv(env);
    ctx.waitUntil(
      (async () => {
        if (event.cron === '0 4 * * *') {
          await runCleanup(env);
        } else if (event.cron === '0 3 * * *') {
          await runBackup(env);
        }
      })()
    );
  }
};

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV,
    release: '0.0.1',
    tracesSampleRate: env.SENTRY_ENV === 'production' ? 0.1 : 1.0
    // Nota: @sentry/cloudflare NO acepta sendDefaultPii aquí (es default
    // false). Para scrubbing fino, usar beforeSend en el client config
    // via `Sentry.init(…, { beforeSend })` dentro de un middleware extra.
  }),
  handler
);
