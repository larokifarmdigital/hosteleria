import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { getDb } from '../db/client.js';
import { users, sessions } from '../db/schema/auth.js';
import { getLucia } from './lucia.js';
import { verifyPassword, DUMMY_HASH } from './password-hash.js';
import { touchLastAccess } from './middleware.js';
import type { Env } from '../env.js';

/**
 * Service de login — valida credenciales y crea sesión Lucia.
 *
 * Se mantiene DESACOPLADO de Hono/HTTP para poder testear independiente
 * del request. La ruta en `src/auth/route.ts` solo orquesta: parseo del
 * body + llamada a este service + response con cookie.
 */

interface LoginMetadata {
  /** `X-Forwarded-For` del request. Se hashea con SHA-256 para GDPR. */
  ip: string;
  /** `User-Agent` del request. Se trunca a 500 chars. */
  userAgent: string | null;
}

interface LoginResult {
  user: { id: string; email: string; name: string; role: 'admin' | 'editor'; avatarColor: string };
  /** Header `Set-Cookie` ya serializado — el handler lo pone en la response. */
  sessionCookie: string;
}

/**
 * Valida email+password y crea la sesión. Devuelve el user DTO + la cookie
 * lista para añadir a la response.
 *
 * Lanza `HTTPException(401, invalid_credentials)` si falla la verificación.
 * La comparación es en **tiempo constante** (hash dummy si el user no existe)
 * — no filtramos si el email está en BD.
 */
export async function performLogin(
  env: Env,
  input: { email: string; password: string },
  metadata: LoginMetadata
): Promise<LoginResult> {
  const db = getDb(env.DATABASE_URL);

  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase())
  });

  // Timing-constant: siempre corremos verifyPassword, incluso si el user no existe.
  const passwordHash = user?.passwordHash ?? DUMMY_HASH;
  const ok = await verifyPassword(input.password, passwordHash).catch(() => false);
  if (!user || !ok) {
    throw new HTTPException(401, { message: 'invalid_credentials' });
  }

  // Crea session Lucia + cookie.
  const lucia = getLucia(env, { production: env.SENTRY_ENV === 'production' });
  const session = await lucia.createSession(user.id, {});
  const cookie = lucia.createSessionCookie(session.id).serialize();

  // Enriquecer con metadata (user agent + hash IP) para la UI multi-sesión.
  // IP crudo NO se guarda (GDPR) — solo SHA-256 truncado.
  const ipHash = createHash('sha256').update(metadata.ip).digest('hex').slice(0, 16);
  await db
    .update(sessions)
    .set({ userAgent: metadata.userAgent?.slice(0, 500) ?? null, ipHash })
    .where(eq(sessions.id, session.id));

  // Fire-and-forget: no bloquea la respuesta.
  void touchLastAccess(env, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarColor: user.avatarColor
    },
    sessionCookie: cookie
  };
}

/** Extrae la IP del request soportando headers de Cloudflare y proxies. */
export function extractIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip')
    ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers.get('x-real-ip')
    ?? 'unknown'
  );
}
