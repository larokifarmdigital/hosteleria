import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { getDb } from '../db/client.js';
import { users, sessions } from '../db/schema/auth.js';

/**
 * Lucia auth — sesiones basadas en cookie HTTP-only.
 *
 * En prod la cookie es `Domain=.hosteleria.cat` para compartirse entre
 * `studio.hosteleria.cat` (backoffice) y `api.hosteleria.cat` (esta app).
 * En dev localhost la cookie va sin `Domain` y el fetch usa
 * `credentials: 'include'` desde el backoffice.
 */
let _lucia: Lucia | null = null;

export function getLucia(databaseUrl: string, opts: { production: boolean }) {
  if (_lucia) return _lucia;

  const db = getDb(databaseUrl) as any; // Drizzle types compatibles con adapter
  const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

  _lucia = new Lucia(adapter, {
    sessionCookie: {
      name: 'hs_session',
      expires: false, // rolling: renovamos en cada request
      attributes: {
        secure: opts.production,
        // 'none' permite cross-origin (ej. backoffice en localhost hablando con
        // api en vercel.app). Requiere Secure=true, que ya está en prod.
        // En dev localhost ambos corren en localhost → Lax funciona bien.
        sameSite: opts.production ? 'none' : 'lax',
        // Domain lo seteás vía COOKIE_DOMAIN env (ej. '.hosteleria.cat') cuando
        // deployes backoffice y api bajo el mismo apex y quieras compartir
        // cookie entre subdominios. Sin esa env, la cookie se scopa al host
        // exacto que la emite — correcto cuando api vive en vercel.app.
        domain: process.env.COOKIE_DOMAIN || undefined
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
