import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { getDb } from '../db/client.js';
import { users, sessions } from '../db/schema/auth.js';
import type { Env } from '../env.js';

/**
 * Lucia auth — sesiones basadas en cookie HTTP-only.
 *
 * En prod producción, `Domain=.hosteleria.cat` (via env.COOKIE_DOMAIN) hace
 * que la cookie se comparta entre `studio.hosteleria.cat` (backoffice) y
 * `api.hosteleria.cat`. Sin COOKIE_DOMAIN, la cookie se scopa al host del
 * api — correcto para dev local o cuando api/backoffice están en dominios
 * distintos (y usan `SameSite=None`).
 *
 * Cacheamos la instancia por isolate — el adapter Drizzle crea su propio
 * cliente de BD y no vale la pena reconstruir en cada request.
 */
let _lucia: Lucia | null = null;

export function getLucia(env: Env, opts: { production: boolean }) {
  if (_lucia) return _lucia;

  const db = getDb(env.DATABASE_URL) as any;
  const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

  _lucia = new Lucia(adapter, {
    sessionCookie: {
      name: 'hs_session',
      expires: false, // rolling: renovamos en cada request
      attributes: {
        secure: opts.production,
        // 'none' permite cross-origin. Requiere Secure=true.
        sameSite: opts.production ? 'none' : 'lax',
        domain: env.COOKIE_DOMAIN || undefined
      }
    },
    getUserAttributes: (attrs) => ({
      email: attrs.email,
      name: attrs.name,
      role: attrs.role,
      avatarColor: attrs.avatarColor
    })
  });

  return _lucia;
}

// Nota: el `declare module 'lucia'` está en `src/lucia.d.ts` para que TS
// lo cargue globalmente sin depender del orden de imports.
