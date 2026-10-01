import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe ser al menos 32 chars'),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional(),
  ALLOWED_ORIGIN: z.string().default('http://localhost:4400'),
  PORT: z.coerce.number().default(8787),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().default('development'),
  CRON_SECRET: z.string().optional(),

  // Email provider (opcional — stub console si no hay)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Hosteleria Studio <no-reply@hosteleria.cat>'),

  // URL del backoffice para construir links en emails
  APP_URL: z.string().url().default('http://localhost:4400')
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Lee y valida el entorno. En Vercel `process.env` viene del dashboard;
 * en dev `dotenv/config` lo carga desde .env.local (via drizzle.config.ts
 * o el propio dev.ts).
 */
export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Env inválido:', parsed.error.flatten().fieldErrors);
    throw new Error('Env inválido — revisa .env.local');
  }
  return parsed.data;
}
