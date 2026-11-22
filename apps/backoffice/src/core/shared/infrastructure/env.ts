import { z } from 'zod';

const EnvSchema = z.object({
  /** URL de Neon con pooler (`-pooler` en el host): una función serverless abre conexiones a ráfagas. */
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  /** `production` marca la cookie de sesión como `Secure; SameSite=None`; cualquier otro valor, `Lax` sin `Secure` (http en local). */
  APP_ENV: z.string().default('production'),
  /** Domain de la cookie de sesión (ej. `.hosteleria.cat`). Vacío = el host que responde. */
  COOKIE_DOMAIN: z.string().optional(),
  /** Sin él, las rutas `/api/cron/*` rechazan todas las llamadas. */
  CRON_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Hosteleria Studio <no-reply@hosteleria.cat>'),
  /** Origen del backoffice: con él se montan los enlaces de invitación y de cambio de contraseña. */
  APP_URL: z.string().url().default('http://localhost:4400'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/**
 * Entorno validado, una vez por proceso. Se lee al primer uso y no al importar
 * el módulo: `next build` evalúa las rutas sin tener las variables de producción.
 */
export function getEnv(): Env {
  if (cached) return cached;
  // Una variable vacía en `.env` o en Vercel cuenta como no definida.
  const source = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    console.error('Entorno inválido:', parsed.error.flatten().fieldErrors);
    throw new Error('Entorno inválido: revisa las variables del proyecto (.env.local o Vercel)');
  }
  cached = parsed.data;
  return cached;
}
