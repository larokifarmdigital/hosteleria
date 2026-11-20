import * as Sentry from '@sentry/cloudflare';
import type { ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { createApp } from './app.js';
import { runCleanup } from './scheduled/cleanup.js';
import { runBackup } from './scheduled/backup.js';
import { assertEnv, type Env } from './env.js';

// La app se crea una vez por isolate, no por request.
const app = createApp();

const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    assertEnv(env);
    return app.fetch(request, env, ctx);
  },

  // Los schedules deben coincidir con wrangler.toml#triggers.
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

// Sin `SENTRY_DSN` el wrapper es un no-op.
export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV,
    release: '0.0.1',
    tracesSampleRate: env.SENTRY_ENV === 'production' ? 0.1 : 1.0
    // @sentry/cloudflare no acepta `sendDefaultPii` aquí (default false).
  }),
  handler
);
