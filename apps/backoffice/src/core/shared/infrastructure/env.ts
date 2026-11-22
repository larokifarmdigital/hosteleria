import { z } from 'zod';
import type { R2Bucket } from '@cloudflare/workers-types';

// En Workers no hay `process.env`: Hono lo expone en `c.env` y fuera del
// context se pasa como parámetro.
export interface Env {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  CRON_SECRET?: string;
  RESEND_API_KEY?: string;
  SENTRY_DSN?: string;
  /** Domain de la cookie de sesión (ej. `.hosteleria.cat`) para compartirla
   *  entre subdominios. Vacío = host del api. */
  COOKIE_DOMAIN?: string;

  R2_BUCKET: string;
  R2_PUBLIC_URL: string;
  ALLOWED_ORIGIN: string;
  SENTRY_ENV: string;
  EMAIL_FROM: string;
  APP_URL: string;

  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_NAME?: string;

  /** Binding R2 para operaciones directas desde el Worker. Las presigned
   *  URLs de upload cliente→R2 se firman aparte con aws4fetch. */
  MEDIA: R2Bucket;
}

// Se valida una vez por isolate (el estado de módulo se reusa entre requests).
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  ALLOWED_ORIGIN: z.string().default('http://localhost:4400'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().default('production'),
  CRON_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Hosteleria Studio <no-reply@hosteleria.cat>'),
  APP_URL: z.string().url().default('http://localhost:4400'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional()
});

let _validated = false;
export function assertEnv(env: Env): Env {
  if (_validated) return env;
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    console.error('❌ Env inválido:', parsed.error.flatten().fieldErrors);
    throw new Error('Env inválido — revisa wrangler.toml y secrets');
  }
  _validated = true;
  return env;
}
