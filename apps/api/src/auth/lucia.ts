import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { getDb } from '../db/client';
import { users, sessions } from '../db/schema/auth';

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
        sameSite: 'lax',
        // En prod se comparte cookie entre subdominios del apex.
        domain: opts.production ? '.hosteleria.cat' : undefined
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
