import { z } from 'zod';
import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * Env del Worker — mezcla de **secrets/vars** (strings via `wrangler secret put`)
 * y **bindings** (recursos Cloudflare, p.ej. R2 bucket).
 *
 * Los secrets/vars vienen de `wrangler.toml#vars` o del dashboard. Los bindings
 * vienen de `wrangler.toml#r2_buckets`, `#kv_namespaces`, etc.
 *
 * En Workers esto NO es `process.env`. Hono lo expone en `c.env` cuando usamos
 * `new Hono<{ Bindings: Env }>()`. Para acceder desde un helper fuera del
 * context, se pasa explícito como parámetro.
 */
export interface Env {
  // ─── Secrets (wrangler secret put NAME) ───────────────────────────
  DATABASE_URL: string;
  SESSION_SECRET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  CRON_SECRET?: string;
  RESEND_API_KEY?: string;
  SENTRY_DSN?: string;
  /** Si está seteado (ej. `.hosteleria.cat`), la cookie de sesión usa ese
   *  Domain → se comparte entre subdominios del apex. Vacío = cookie se
   *  scopa al host del api. */
  COOKIE_DOMAIN?: string;

  // ─── Vars no-secretas (wrangler.toml#vars) ────────────────────────
  R2_BUCKET: string;
  R2_PUBLIC_URL: string;
  ALLOWED_ORIGIN: string;
  SENTRY_ENV: string;
  EMAIL_FROM: string;
  APP_URL: string;

  // ─── Seed inicial (solo primera corrida) ──────────────────────────
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_NAME?: string;

  // ─── Bindings de recursos Cloudflare ──────────────────────────────
  /** R2 bucket para media. Usar `env.MEDIA.get()`, `.put()`, etc. para
   *  operaciones directas desde el Worker. Para presigned URLs de upload
   *  cliente→R2 seguimos usando signed URLs via aws4fetch (ver lib/r2.ts). */
  MEDIA: R2Bucket;
}

/**
 * Valida que todas las vars críticas estén presentes. Se corre UNA vez
 * por isolate en el primer request (lazy). En Workers, un isolate reusa
 * state entre requests así que es gratis cachear.
 */
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
